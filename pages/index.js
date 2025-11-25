import { useState, useEffect } from 'react';
import Head from 'next/head';
import InputSection from '../components/InputSection';
import ConversationView from '../components/ConversationView';
import DataTable from '../components/DataTable';
import ScopePreview from '../components/ScopePreview';
import TabNavigation from '../components/TabNavigation';
import SketchCanvas from '../components/SketchCanvas';
import PhotoGallery from '../components/PhotoGallery';
import { mockProcessAPI, mockSubmitAPI, mockStructuredData } from '../lib/mockData';
import { stopSpeaking } from '../lib/tts';

export default function Home() {
  const [conversationHistory, setConversationHistory] = useState([]);
  const [structuredData, setStructuredData] = useState({
    workOrderNumber: '',
    unitNumber: '',
    address: '',
    unitSquareFeet: '',
    unitLayout: '',
    workItems: []
  });
  const [englishScope, setEnglishScope] = useState('');
  const [spanishScope, setSpanishScope] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState('input'); // input, review, approved, submitted
  const [enableTTS, setEnableTTS] = useState(true);
  const [inputLanguage, setInputLanguage] = useState('en'); // 'en' or 'es'
  const [activeTab, setActiveTab] = useState('data'); // data, sketch, photos
  const [sketch, setSketch] = useState(null);
  const [photos, setPhotos] = useState([]);

  // Mock mode flag - set to false when APIs are ready
  const MOCK_MODE = true;

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleUserInput = async (userInput, language = 'en') => {
    setIsProcessing(true);

    // Add user message to history with language indicator
    const languageTag = language === 'es' ? ' [ES]' : '';
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: userInput, language }
    ];
    setConversationHistory(newHistory);

    try {
      let result;
      
      if (MOCK_MODE) {
        // Use mock API
        result = await mockProcessAPI(userInput, structuredData, newHistory);
      } else {
        // Real API call - include input language for better LLM processing
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userInput,
            inputLanguage: language,
            currentData: structuredData,
            conversationHistory: newHistory
          })
        });
        result = await response.json();
      }

      // Add assistant response to history
      const updatedHistory = [
        ...newHistory,
        { role: 'assistant', content: result.assistantMessage }
      ];
      setConversationHistory(updatedHistory);

      // Update structured data if changed
      if (result.updatedData) {
        setStructuredData(result.updatedData);
      }

      // Check if conversation is complete
      if (result.isComplete) {
        setIsComplete(true);
        setCurrentStep('review');
      }

    } catch (error) {
      console.error('Error processing input:', error);
      // Add error message to conversation
      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateScopes = async () => {
    setIsProcessing(true);
    setCurrentStep('approved');

    try {
      let result;
      
      if (MOCK_MODE) {
        // Use mock API
        result = await mockSubmitAPI(structuredData);
      } else {
        // Real API call with proper upload flow
        // Import these when ready to connect: 
        // import { uploadPhotosWithProgress, uploadSketchToDrive, submitFormWithPhotoUrls } from '../lib/googleDrive';
        
        // TODO: When connecting to real API, implement this flow:
        /*
        const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
        
        // Step 1: Upload photos to Drive (if any)
        let photoUrls = [];
        if (photos.length > 0) {
          photoUrls = await uploadPhotosWithProgress(photos, APPS_SCRIPT_URL, (progress) => {
            console.log(`Uploading photo ${progress.current} of ${progress.total}: ${progress.photoName}`);
            // TODO: Show progress in UI
          });
        }
        
        // Step 2: Upload sketch to Drive (if exists)
        let sketchUrl = null;
        if (sketch) {
          sketchUrl = await uploadSketchToDrive(sketch, APPS_SCRIPT_URL);
        }
        
        // Step 3: Generate scopes via API
        const scopeResponse = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredData })
        });
        const scopeResult = await scopeResponse.json();
        
        // Step 4: Submit everything to Sheets with URLs (not base64!)
        result = await submitFormWithPhotoUrls({
          structuredData,
          englishScope: scopeResult.englishScope,
          spanishScope: scopeResult.spanishScope,
          photoUrls,  // Just URLs, ~50 bytes each
          sketchUrl   // Just one URL, ~50 bytes
          // Total payload: <5KB even with 10 photos + sketch!
        }, APPS_SCRIPT_URL);
        */
        
        // For now, use existing API
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            structuredData,
            photoCount: photos.length,
            hasSketch: !!sketch
          })
        });
        result = await response.json();
      }

      if (result.success) {
        setEnglishScope(result.englishScope);
        setSpanishScope(result.spanishScope);
        setIsSubmitted(true);
        setCurrentStep('submitted');
      }

    } catch (error) {
      console.error('Error submitting:', error);
      alert('Failed to generate scopes. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setConversationHistory([]);
    setStructuredData({
      workOrderNumber: '',
      unitNumber: '',
      address: '',
      unitSquareFeet: '',
      unitLayout: '',
      workItems: []
    });
    setEnglishScope('');
    setSpanishScope('');
    setIsComplete(false);
    setIsSubmitted(false);
    setCurrentStep('input');
    setSketch(null);
    setPhotos([]);
    setActiveTab('data');
  };

  const loadMockData = () => {
    setStructuredData(mockStructuredData);
    setConversationHistory([
      { role: 'user', content: 'I need 3 walls painted in the living room' },
      { role: 'assistant', content: 'Got it. What\'s the square footage?' },
      { role: 'user', content: 'About 450 square feet total' },
      { role: 'assistant', content: 'Any other work needed?' },
      { role: 'user', content: 'Yes, clean the bedroom floors, 250 square feet' },
      { role: 'assistant', content: 'Perfect. I have all the information. Ready to generate scope.' }
    ]);
    setIsComplete(true);
    setCurrentStep('review');
  };

  // Define tabs
  const tabs = [
    { 
      id: 'data', 
      icon: '📊', 
      label: 'Data Table',
      badge: structuredData.workItems.length || null
    },
    { 
      id: 'sketch', 
      icon: '✏️', 
      label: 'Floor Plan',
      badge: sketch ? '✓' : null
    },
    { 
      id: 'photos', 
      icon: '📷', 
      label: 'Photos',
      badge: photos.length || null
    }
  ];

  return (
    <div className="container">
      <Head>
        <title>Turnovers - Job Site Assessment</title>
        <meta name="description" content="Streamline job site assessments" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <header>
          <h1>🔨 Turnovers</h1>
          <p className="subtitle">Job Site Assessment Tool</p>
          <div className="header-controls">
            {MOCK_MODE && (
              <div className="mock-banner">
                🧪 MOCK MODE - Using simulated data (APIs not connected)
              </div>
            )}
            <button 
              onClick={() => setEnableTTS(!enableTTS)}
              className="tts-toggle"
              title={enableTTS ? 'Disable voice responses' : 'Enable voice responses'}
            >
              {enableTTS ? '🔊 Voice On' : '🔇 Voice Off'}
            </button>
          </div>
        </header>

        <div className="layout">
          {/* Left Column - Input & Conversation */}
          <div className="left-column">
            <InputSection 
              onSubmit={handleUserInput}
              isProcessing={isProcessing}
              disabled={isComplete}
              language={inputLanguage}
              onLanguageChange={setInputLanguage}
            />
            
            <ConversationView 
              history={conversationHistory}
              enableTTS={enableTTS}
              ttsLanguage={inputLanguage}
            />
            
            {/* Action Buttons */}
            <div className="actions">
              {MOCK_MODE && !isComplete && (
                <button onClick={loadMockData} className="btn btn-secondary">
                  Load Mock Data
                </button>
              )}
              
              {isComplete && !isSubmitted && (
                <button 
                  onClick={handleGenerateScopes} 
                  className="btn btn-success"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Generating...' : 'Generate Scopes & Submit'}
                </button>
              )}
              
              {isSubmitted && (
                <button onClick={handleReset} className="btn btn-secondary">
                  Start New Assessment
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Tabbed Content */}
          <div className="right-column">
            <TabNavigation 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={tabs}
            />
            
            <div className="tab-content">
              {activeTab === 'data' && (
                <>
                  <DataTable data={structuredData} />
                  
                  {(englishScope || spanishScope) && (
                    <ScopePreview 
                      englishScope={englishScope}
                      spanishScope={spanishScope}
                    />
                  )}
                  
                  {isSubmitted && (
                    <div className="success-message">
                      ✅ Successfully submitted to Google Sheets!
                    </div>
                  )}
                </>
              )}
              
              {activeTab === 'sketch' && (
                <SketchCanvas 
                  sketch={sketch}
                  onSketchChange={setSketch}
                />
              )}
              
              {activeTab === 'photos' && (
                <PhotoGallery 
                  photos={photos}
                  onPhotosChange={setPhotos}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f5f5;
        }
        
        main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
        
        header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        h1 {
          margin: 0;
          font-size: 36px;
          color: #333;
        }
        
        .subtitle {
          margin: 8px 0 0 0;
          color: #666;
          font-size: 18px;
        }
        
        .header-controls {
          margin-top: 16px;
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .mock-banner {
          padding: 12px;
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 6px;
          color: #856404;
          font-weight: 600;
        }
        
        .tts-toggle {
          padding: 8px 16px;
          background: white;
          border: 2px solid #2196F3;
          border-radius: 6px;
          color: #2196F3;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tts-toggle:hover {
          background: #e3f2fd;
        }
        
        .layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        @media (max-width: 968px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
        
        .left-column,
        .right-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
        }
        
        .btn-success {
          background: #4CAF50;
          color: white;
          font-size: 18px;
          padding: 16px 32px;
        }
        
        .btn-success:hover:not(:disabled) {
          background: #45a049;
        }
        
        .btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        
        .success-message {
          background: #d4edda;
          border: 2px solid #28a745;
          color: #155724;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          font-weight: 600;
          font-size: 18px;
        }
      `}</style>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }
      `}</style>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import InputSection from '../components/InputSection';
import ConversationView from '../components/ConversationView';
import DataTable from '../components/DataTable';
import ScopePreview from '../components/ScopePreview';
import TabNavigation from '../components/TabNavigation';
import SketchCanvas from '../components/SketchCanvas';
import PhotoGallery from '../components/PhotoGallery';
import LoginButton from '../components/LoginButton';
import { mockProcessAPI, mockSubmitAPI, mockStructuredData } from '../lib/mockData';
import { stopSpeaking } from '../lib/tts';

export default function Home() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const authenticated = !!session;
  
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
  const [scopesGenerated, setScopesGenerated] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedSheetUrl, setSubmittedSheetUrl] = useState('');
  const [currentStep, setCurrentStep] = useState('input'); // input, review, scopes, submitted
  const [enableTTS, setEnableTTS] = useState(true);
  const [inputLanguage, setInputLanguage] = useState('en'); // 'en' or 'es'
  const [activeTab, setActiveTab] = useState('data'); // data, sketch, photos
  const [sketch, setSketch] = useState(null);
  const [photos, setPhotos] = useState([]);

  // Mock mode flag - set to false when APIs are ready
  const MOCK_MODE = false;

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

    try {
      if (MOCK_MODE) {
        // Use mock scopes
        const result = await mockSubmitAPI(structuredData);
        setEnglishScope(result.englishScope);
        setSpanishScope(result.spanishScope);
      } else {
        // Generate scopes via API (without submitting)
        const response = await fetch('/api/generate-scopes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredData })
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate scopes');
        }
        
        const result = await response.json();
        setEnglishScope(result.englishScope);
        setSpanishScope(result.spanishScope);
      }

      setScopesGenerated(true);
      setCurrentStep('scopes');

    } catch (error) {
      console.error('Error generating scopes:', error);
      alert('Failed to generate scopes. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);

    try {
      // TODO: Implement actual submission to Google Sheets
      // For now, just mark as submitted
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          structuredData,
          englishScope,
          spanishScope,
          sketch: sketch || null,
          photos: photos.map(p => ({
            url: p.url,
            name: p.name,
            caption: p.caption || ''
          }))
        })
      });
      
      const result = await response.json();

      if (result.success) {
        setSubmittedSheetUrl(result.sheetUrl || '');
        setIsSubmitted(true);
        setCurrentStep('submitted');
      } else {
        throw new Error(result.error || 'Submission failed');
      }

    } catch (error) {
      console.error('Error submitting:', error);
      alert('Failed to submit. Please try again.');
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
    setScopesGenerated(false);
    setIsSubmitted(false);
    setSubmittedSheetUrl('');
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
          <div className="header-top">
            <div>
              <h1>🔨 Turnovers</h1>
              <p className="subtitle">Job Site Assessment Tool</p>
            </div>
            <LoginButton />
          </div>
          
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
        
        {loading && (
          <div className="loading-screen">
            <p>Loading...</p>
          </div>
        )}
        
        {!loading && !authenticated && (
          <div className="auth-required">
            <h2>Welcome to Turnovers</h2>
            <p>Please sign in with your Google account to get started.</p>
          </div>
        )}
        
        {!loading && authenticated && (
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
              
              {isComplete && !scopesGenerated && (
                <button 
                  onClick={handleGenerateScopes} 
                  className="btn btn-success"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Generating...' : '✨ Generate Scope of Work'}
                </button>
              )}
              
              {scopesGenerated && !isSubmitted && (
                <div className="scope-actions">
                  <button 
                    onClick={handleGenerateScopes} 
                    className="btn btn-secondary"
                    disabled={isProcessing}
                  >
                    🔄 Regenerate Scopes
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    className="btn btn-success"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Submitting...' : '✅ Submit to Sheets'}
                  </button>
                </div>
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
                      onEnglishChange={setEnglishScope}
                      onSpanishChange={setSpanishScope}
                      editable={scopesGenerated && !isSubmitted}
                    />
                  )}
                  
                  {isSubmitted && (
                    <div className="success-message">
                      <div className="success-icon">✅</div>
                      <div className="success-text">
                        <strong>Successfully submitted!</strong>
                        <p>Sheet "{structuredData.workOrderNumber}" has been created.</p>
                        {submittedSheetUrl && (
                          <a 
                            href={submittedSheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="sheet-link"
                          >
                            📄 Open in Google Sheets →
                          </a>
                        )}
                      </div>
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
        )}
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
          margin-bottom: 32px;
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
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
        
        .loading-screen,
        .auth-required {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .auth-required h2 {
          margin-top: 0;
          color: #333;
        }
        
        .auth-required p {
          color: #666;
          font-size: 16px;
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
          flex-wrap: wrap;
        }
        
        .scope-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
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
          padding: 20px;
          border-radius: 8px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        
        .success-icon {
          font-size: 32px;
          line-height: 1;
        }
        
        .success-text {
          flex: 1;
        }
        
        .success-text strong {
          font-size: 18px;
          display: block;
          margin-bottom: 4px;
        }
        
        .success-text p {
          margin: 0 0 12px 0;
          font-size: 14px;
          opacity: 0.8;
        }
        
        .sheet-link {
          display: inline-block;
          background: #28a745;
          color: white;
          padding: 10px 16px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .sheet-link:hover {
          background: #218838;
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


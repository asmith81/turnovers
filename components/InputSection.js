import { useState, useRef } from 'react';
import VoiceRecorder from './VoiceRecorder';
import LanguageSelector from './LanguageSelector';

export default function InputSection({ onSubmit, isProcessing, disabled, language, onLanguageChange }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState(''); // Full accumulated speech from recognition
  const confirmedSpeechLengthRef = useRef(0); // How much speech user has "confirmed" by editing

  const handleSubmit = (e) => {
    e.preventDefault();
    const textToSubmit = getDisplayText();
    if (textToSubmit.trim() && !isProcessing && !isRecording) {
      onSubmit(textToSubmit, language);
      setInput('');
    }
  };

  // Calculate what to show in textarea
  const getDisplayText = () => {
    if (!isRecording) return input;
    
    // Get any new speech since user last edited
    const newSpeech = currentSpeech.slice(confirmedSpeechLengthRef.current).trim();
    if (!newSpeech) return input;
    
    return input.trim() ? `${input.trim()} ${newSpeech}` : newSpeech;
  };

  const handleChange = (e) => {
    // User is editing - their edit becomes the new base
    setInput(e.target.value);
    // Mark all current speech as "confirmed/incorporated" into their edit
    confirmedSpeechLengthRef.current = currentSpeech.length;
  };

  const handleLiveTranscript = (transcript) => {
    setCurrentSpeech(transcript);
  };

  const handleRecordingChange = (recording) => {
    if (recording && !isRecording) {
      // Starting recording - reset speech tracking
      confirmedSpeechLengthRef.current = 0;
      setCurrentSpeech('');
    }
    setIsRecording(recording);
  };

  const handleVoiceTranscript = (finalTranscript) => {
    // Append any unconfirmed speech to input
    const newSpeech = finalTranscript.slice(confirmedSpeechLengthRef.current).trim();
    if (newSpeech) {
      setInput(prev => prev.trim() ? `${prev.trim()} ${newSpeech}` : newSpeech);
    }
    setCurrentSpeech('');
    confirmedSpeechLengthRef.current = 0;
  };

  const displayText = getDisplayText();

  const placeholders = {
    en: "Describe the work needed... (e.g., '3 walls need paint in the living room')",
    es: "Describe el trabajo necesario... (ej., '3 paredes necesitan pintura en la sala')"
  };

  return (
    <div className="input-section">
      <LanguageSelector 
        language={language}
        onChange={onLanguageChange}
        disabled={disabled || isProcessing || isRecording}
      />
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <textarea
            value={displayText}
            onChange={handleChange}
            placeholder={placeholders[language] || placeholders.en}
            rows={4}
            disabled={disabled || isProcessing}
            className={`input-textarea ${isRecording ? 'recording' : ''}`}
          />
          {isRecording && (
            <div className="recording-overlay">
              <span className="pulse-dot"></span>
              <span>Listening... (you can edit below)</span>
            </div>
          )}
        </div>
        <div className="button-group">
          <VoiceRecorder 
            onTranscript={handleVoiceTranscript}
            onLiveTranscript={handleLiveTranscript}
            onRecordingChange={handleRecordingChange}
            disabled={disabled || isProcessing}
            language={language}
          />
          <button 
            type="submit" 
            disabled={disabled || isProcessing || !displayText.trim() || isRecording}
            className="btn btn-primary"
          >
            {isProcessing ? 'Processing...' : language === 'es' ? 'Enviar' : 'Send'}
          </button>
        </div>
      </form>
      
      <style jsx>{`
        .input-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .input-group {
          margin-bottom: 12px;
          position: relative;
        }
        
        .input-textarea {
          width: 100%;
          padding: 12px;
          padding-top: 36px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s, background-color 0.2s;
          min-height: 100px;
        }
        
        .input-textarea:focus {
          outline: none;
          border-color: #4CAF50;
        }
        
        .input-textarea:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
        
        .input-textarea.recording {
          border-color: #f44336;
          background: #fffafa;
        }
        
        .input-textarea.recording:focus {
          border-color: #f44336;
        }
        
        .recording-overlay {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f44336;
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .pulse-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        .btn {
          padding: 16px 24px;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          min-height: 52px;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        
        .btn-primary {
          background: #4CAF50;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #45a049;
          transform: scale(1.02);
        }
        
        .btn-primary:active:not(:disabled) {
          transform: scale(0.97);
        }
        
        .btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        
        .button-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }
      `}</style>
    </div>
  );
}

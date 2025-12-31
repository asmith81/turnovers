import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import LanguageSelector from './LanguageSelector';

export default function InputSection({ onSubmit, isProcessing, disabled, language, onLanguageChange }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [preRecordingText, setPreRecordingText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing && !isRecording) {
      onSubmit(input, language);
      setInput('');
    }
  };

  const handleVoiceTranscript = (transcript) => {
    // Final transcript received - append to pre-recording text
    if (transcript.trim()) {
      const newText = preRecordingText.trim() 
        ? `${preRecordingText.trim()} ${transcript.trim()}` 
        : transcript.trim();
      setInput(newText);
    }
    setLiveTranscript('');
    setPreRecordingText('');
  };

  const handleLiveTranscript = (transcript) => {
    // Update live transcript display
    setLiveTranscript(transcript);
  };

  const handleRecordingChange = (recording) => {
    if (recording && !isRecording) {
      // Just started recording - save current input
      setPreRecordingText(input);
    }
    setIsRecording(recording);
  };

  // Display text: pre-recording text + live transcript while recording, otherwise just input
  const displayText = isRecording 
    ? (preRecordingText.trim() ? `${preRecordingText.trim()} ${liveTranscript}` : liveTranscript)
    : input;

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
            onChange={(e) => !isRecording && setInput(e.target.value)}
            placeholder={placeholders[language] || placeholders.en}
            rows={4}
            disabled={disabled || isProcessing}
            readOnly={isRecording}
            className={`input-textarea ${isRecording ? 'recording' : ''}`}
          />
          {isRecording && (
            <div className="recording-overlay">
              <span className="pulse-dot"></span>
              <span>Listening...</span>
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
            disabled={disabled || isProcessing || !input.trim() || isRecording}
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
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s, background-color 0.2s;
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
          background: #fff8f8;
          cursor: default;
        }
        
        .recording-overlay {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f44336;
          color: white;
          border-radius: 12px;
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
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: #4CAF50;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #45a049;
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

import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import LanguageSelector from './LanguageSelector';

export default function InputSection({ onSubmit, isProcessing, disabled, language, onLanguageChange }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSubmit(input, language);
      setInput('');
    }
  };

  const handleVoiceTranscript = (transcript) => {
    // Append to existing input or send immediately
    if (transcript.trim()) {
      // Auto-submit voice input with language tag
      onSubmit(transcript, language);
    }
  };

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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholders[language] || placeholders.en}
            rows={4}
            disabled={disabled || isProcessing || isRecording}
            className="input-textarea"
          />
        </div>
        <div className="button-group">
          <VoiceRecorder 
            onTranscript={handleVoiceTranscript}
            onRecordingChange={setIsRecording}
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
        }
        
        .input-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          font-family: inherit;
          resize: vertical;
        }
        
        .input-textarea:focus {
          outline: none;
          border-color: #4CAF50;
        }
        
        .input-textarea:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
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


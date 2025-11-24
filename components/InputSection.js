import { useState } from 'react';

export default function InputSection({ onSubmit, isProcessing, disabled }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSubmit(input);
      setInput('');
    }
  };

  return (
    <div className="input-section">
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the work needed... (e.g., '3 walls need paint in the living room')"
            rows={4}
            disabled={disabled || isProcessing}
            className="input-textarea"
          />
        </div>
        <button 
          type="submit" 
          disabled={disabled || isProcessing || !input.trim()}
          className="btn btn-primary"
        >
          {isProcessing ? 'Processing...' : 'Send'}
        </button>
      </form>
      
      <style jsx>{`
        .input-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
      `}</style>
    </div>
  );
}


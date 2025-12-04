import { useState, useCallback, useRef } from 'react';

export default function ScopePreview({ 
  englishScope, 
  spanishScope, 
  onEnglishChange, 
  onSpanishChange,
  editable = false 
}) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeEdit, setActiveEdit] = useState(null); // 'en' or 'es'
  const debounceRef = useRef(null);

  const translateScope = useCallback(async (text, targetLanguage) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage })
      });
      
      if (response.ok) {
        const { translatedText } = await response.json();
        if (targetLanguage === 'es') {
          onSpanishChange(translatedText);
        } else {
          onEnglishChange(translatedText);
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [onEnglishChange, onSpanishChange]);

  const handleEnglishChange = (e) => {
    const newText = e.target.value;
    onEnglishChange(newText);
    setActiveEdit('en');
    
    // Debounce translation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      translateScope(newText, 'es');
    }, 1500); // Wait 1.5s after typing stops
  };

  const handleSpanishChange = (e) => {
    const newText = e.target.value;
    onSpanishChange(newText);
    setActiveEdit('es');
    
    // Debounce translation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      translateScope(newText, 'en');
    }, 1500);
  };

  if (!englishScope && !spanishScope) {
    return null;
  }

  return (
    <div className="scope-preview">
      <div className="scope-header">
        <h3>📝 Scope of Work</h3>
        {isTranslating && (
          <span className="translating-badge">
            🔄 Translating...
          </span>
        )}
      </div>
      
      {editable && (
        <p className="edit-hint">
          Edit either version below. Changes will auto-translate to the other language.
        </p>
      )}
      
      <div className="scope-sections">
        <div className="scope-section">
          <h4>🇺🇸 English</h4>
          {editable ? (
            <textarea
              value={englishScope}
              onChange={handleEnglishChange}
              className={`scope-textarea ${activeEdit === 'es' && isTranslating ? 'updating' : ''}`}
              rows={8}
              placeholder="English scope of work..."
            />
          ) : (
            <div className="scope-content">
              {englishScope}
            </div>
          )}
        </div>
        
        <div className="scope-section">
          <h4>🇪🇸 Spanish / Español</h4>
          {editable ? (
            <textarea
              value={spanishScope}
              onChange={handleSpanishChange}
              className={`scope-textarea ${activeEdit === 'en' && isTranslating ? 'updating' : ''}`}
              rows={8}
              placeholder="Alcance del trabajo en español..."
            />
          ) : (
            <div className="scope-content">
              {spanishScope}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .scope-preview {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .scope-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        h3 {
          margin: 0;
          color: #333;
        }
        
        .translating-badge {
          background: #fff3cd;
          color: #856404;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .edit-hint {
          color: #666;
          font-size: 14px;
          margin: 0 0 16px 0;
          padding: 10px;
          background: #f0f7ff;
          border-radius: 6px;
          border-left: 3px solid #2196F3;
        }
        
        .scope-sections {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .scope-section {
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }
        
        h4 {
          margin: 0;
          padding: 12px 16px;
          background: #f5f5f5;
          color: #555;
          font-size: 14px;
          font-weight: 600;
          border-bottom: 2px solid #e0e0e0;
        }
        
        .scope-content {
          padding: 16px;
          color: #333;
          line-height: 1.6;
          white-space: pre-wrap;
          font-size: 14px;
        }
        
        .scope-textarea {
          width: 100%;
          min-height: 150px;
          padding: 16px;
          border: none;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.6;
          resize: vertical;
          transition: background 0.3s;
        }
        
        .scope-textarea:focus {
          outline: none;
          background: #fffef0;
        }
        
        .scope-textarea.updating {
          background: #f5f5f5;
          color: #888;
        }
        
        @media (min-width: 768px) {
          .scope-sections {
            flex-direction: row;
          }
          
          .scope-section {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

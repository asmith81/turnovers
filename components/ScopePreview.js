import { useState, useCallback, useRef } from 'react';
import { markdownToHtml } from '../lib/markdownUtils';

export default function ScopePreview({ 
  englishScope, 
  spanishScope, 
  onEnglishChange, 
  onSpanishChange,
  editable = false 
}) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeEdit, setActiveEdit] = useState(null); // 'en' or 'es'
  const [isEditMode, setIsEditMode] = useState(false); // Toggle between view and edit
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

  // Determine if we should show edit mode (must be editable AND in edit mode)
  const showEditMode = editable && isEditMode;

  return (
    <div className="scope-preview">
      <div className="scope-header">
        <h3>📝 Scope of Work</h3>
        <div className="header-actions">
          {isTranslating && (
            <span className="translating-badge">
              🔄 Translating...
            </span>
          )}
          {editable && (
            <button 
              className={`mode-toggle ${isEditMode ? 'edit-active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? '👁️ View' : '✏️ Edit'}
            </button>
          )}
        </div>
      </div>
      
      {editable && (
        <p className="edit-hint">
          {isEditMode ? (
            <>
              ✏️ <strong>Edit Mode:</strong> Make changes below. Auto-translates after 1.5s pause. 
              Click <strong>👁️ View</strong> to see formatted preview.
            </>
          ) : (
            <>
              👁️ <strong>Preview Mode:</strong> Viewing formatted scope. 
              Click <strong>✏️ Edit</strong> to make changes.
            </>
          )}
        </p>
      )}
      
      <div className="scope-sections">
        <div className="scope-section">
          <h4>🇺🇸 English</h4>
          {showEditMode ? (
            <textarea
              value={englishScope}
              onChange={handleEnglishChange}
              className={`scope-textarea ${activeEdit === 'es' && isTranslating ? 'updating' : ''}`}
              rows={8}
              placeholder="English scope of work..."
            />
          ) : (
            <div 
              className="scope-content"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(englishScope) }}
            />
          )}
        </div>
        
        <div className="scope-section">
          <h4>🇪🇸 Spanish / Español</h4>
          {showEditMode ? (
            <textarea
              value={spanishScope}
              onChange={handleSpanishChange}
              className={`scope-textarea ${activeEdit === 'en' && isTranslating ? 'updating' : ''}`}
              rows={8}
              placeholder="Alcance del trabajo en español..."
            />
          ) : (
            <div 
              className="scope-content"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(spanishScope) }}
            />
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
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .mode-toggle {
          padding: 8px 16px;
          border: 2px solid #2196F3;
          background: white;
          color: #2196F3;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mode-toggle:hover {
          background: #e3f2fd;
        }
        
        .mode-toggle.edit-active {
          background: #2196F3;
          color: white;
        }
        
        .mode-toggle.edit-active:hover {
          background: #1976d2;
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
          padding: 12px 16px;
          background: #f0f7ff;
          border-radius: 6px;
          border-left: 4px solid #2196F3;
          line-height: 1.5;
        }
        
        .edit-hint strong {
          color: #1976d2;
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
          font-size: 14px;
        }
        
        .scope-content h2,
        .scope-content h3,
        .scope-content h4 {
          margin: 16px 0 8px 0;
          color: #333;
        }
        
        .scope-content h2:first-child,
        .scope-content h3:first-child,
        .scope-content h4:first-child {
          margin-top: 0;
        }
        
        .scope-content strong {
          font-weight: 600;
        }
        
        .scope-content em {
          font-style: italic;
        }
        
        .scope-content ul {
          margin: 8px 0;
          padding-left: 24px;
        }
        
        .scope-content li {
          margin: 4px 0;
        }
        
        .scope-content br {
          display: block;
          content: "";
          margin-top: 8px;
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

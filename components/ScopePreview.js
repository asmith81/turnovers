export default function ScopePreview({ englishScope, spanishScope }) {
  if (!englishScope && !spanishScope) {
    return null;
  }

  return (
    <div className="scope-preview">
      <h3>Generated Scope of Work</h3>
      
      <div className="scope-sections">
        {englishScope && (
          <div className="scope-section">
            <h4>English</h4>
            <div className="scope-content">
              {englishScope}
            </div>
          </div>
        )}
        
        {spanishScope && (
          <div className="scope-section">
            <h4>Spanish / Español</h4>
            <div className="scope-content">
              {spanishScope}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .scope-preview {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #333;
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
      `}</style>
    </div>
  );
}


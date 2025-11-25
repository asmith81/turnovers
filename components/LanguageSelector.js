export default function LanguageSelector({ language, onChange, disabled }) {
  return (
    <div className="language-selector">
      <label className="selector-label">Voice Language:</label>
      <div className="language-buttons">
        <button
          type="button"
          onClick={() => onChange('en')}
          disabled={disabled}
          className={`lang-button ${language === 'en' ? 'active' : ''}`}
        >
          🇺🇸 English
        </button>
        <button
          type="button"
          onClick={() => onChange('es')}
          disabled={disabled}
          className={`lang-button ${language === 'es' ? 'active' : ''}`}
        >
          🇪🇸 Español
        </button>
      </div>

      <style jsx>{`
        .language-selector {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selector-label {
          font-size: 14px;
          font-weight: 600;
          color: #555;
        }

        .language-buttons {
          display: flex;
          gap: 8px;
        }

        .lang-button {
          padding: 8px 16px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #555;
        }

        .lang-button:hover:not(:disabled) {
          border-color: #2196F3;
          background: #e3f2fd;
        }

        .lang-button.active {
          border-color: #2196F3;
          background: #2196F3;
          color: white;
        }

        .lang-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}


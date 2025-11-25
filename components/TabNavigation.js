export default function TabNavigation({ activeTab, onTabChange, tabs }) {
  return (
    <div className="tab-navigation">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.badge && (
              <span className="tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      <style jsx>{`
        .tab-navigation {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .tabs {
          display: flex;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab {
          flex: 1;
          padding: 16px 20px;
          border: none;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #666;
          transition: all 0.2s;
          position: relative;
          border-bottom: 3px solid transparent;
        }

        .tab:hover {
          background: #f9f9f9;
          color: #333;
        }

        .tab.active {
          color: #2196F3;
          border-bottom-color: #2196F3;
          background: #f0f8ff;
        }

        .tab-icon {
          font-size: 20px;
        }

        .tab-label {
          white-space: nowrap;
        }

        .tab-badge {
          background: #f44336;
          color: white;
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          min-width: 20px;
          text-align: center;
        }

        @media (max-width: 600px) {
          .tab {
            flex-direction: column;
            padding: 12px 8px;
            font-size: 14px;
            gap: 4px;
          }

          .tab-icon {
            font-size: 24px;
          }

          .tab-label {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}


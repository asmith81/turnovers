export default function DataTable({ data }) {
  const { projectInfo, workItems, notes } = data;

  return (
    <div className="data-table">
      <h3>Structured Data</h3>
      
      {/* Project Info */}
      <div className="section">
        <h4>Project Information</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Address:</span>
            <span className="value">{projectInfo.address || '—'}</span>
          </div>
          <div className="info-item">
            <span className="label">Date:</span>
            <span className="value">{projectInfo.date || '—'}</span>
          </div>
          <div className="info-item">
            <span className="label">Assessor:</span>
            <span className="value">{projectInfo.assessor || '—'}</span>
          </div>
        </div>
      </div>

      {/* Work Items */}
      <div className="section">
        <h4>Work Items ({workItems.length})</h4>
        {workItems.length === 0 ? (
          <p className="empty">No work items yet</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Room</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {workItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={`badge ${item.category}`}>
                        {item.category}
                      </span>
                    </td>
                    <td>{item.room || '—'}</td>
                    <td>{item.description || '—'}</td>
                    <td>{item.quantity || '—'}</td>
                    <td>{item.unit || '—'}</td>
                    <td>{item.unitPrice ? `$${item.unitPrice}` : '—'}</td>
                    <td className="total">
                      {item.total ? `$${item.total.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="6" className="total-label">Grand Total</td>
                  <td className="total grand-total">
                    ${workItems.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <div className="section">
          <h4>Notes</h4>
          <p className="notes">{notes}</p>
        </div>
      )}

      <style jsx>{`
        .data-table {
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
        
        h4 {
          margin-top: 0;
          margin-bottom: 12px;
          color: #555;
          font-size: 16px;
        }
        
        .section {
          margin-bottom: 24px;
        }
        
        .section:last-child {
          margin-bottom: 0;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
        }
        
        .value {
          color: #333;
          font-size: 14px;
        }
        
        .empty {
          color: #999;
          font-style: italic;
          padding: 20px;
          text-align: center;
          background: #f9f9f9;
          border-radius: 6px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        th {
          background: #f5f5f5;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #555;
          border-bottom: 2px solid #ddd;
        }
        
        td {
          padding: 10px;
          border-bottom: 1px solid #eee;
          color: #333;
        }
        
        tbody tr:hover {
          background: #fafafa;
        }
        
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .badge.paint {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .badge.floor {
          background: #f3e5f5;
          color: #7b1fa2;
        }
        
        .badge.repair {
          background: #fff3e0;
          color: #e65100;
        }
        
        .badge.clean {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .badge.other {
          background: #f5f5f5;
          color: #616161;
        }
        
        .total {
          font-weight: 600;
          text-align: right;
        }
        
        .total-label {
          text-align: right;
          font-weight: 600;
          color: #555;
        }
        
        .grand-total {
          font-size: 16px;
          color: #4CAF50;
        }
        
        tfoot td {
          border-top: 2px solid #ddd;
          border-bottom: none;
          padding-top: 12px;
        }
        
        .notes {
          background: #fffde7;
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid #fbc02d;
          color: #333;
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}


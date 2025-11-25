import { formatPrice } from '../lib/pricingCatalog';

export default function DataTable({ data }) {
  const { workOrderNumber, unitNumber, address, unitSquareFeet, unitLayout, workItems } = data;

  return (
    <div className="data-table">
      <h3>Turnover Assessment</h3>
      
      {/* Project Info */}
      <div className="section">
        <h4>Project Information</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Work Order #:</span>
            <span className="value">{workOrderNumber || '—'}</span>
          </div>
          <div className="info-item">
            <span className="label">Unit #:</span>
            <span className="value">{unitNumber || '—'}</span>
          </div>
          <div className="info-item">
            <span className="label">Address:</span>
            <span className="value">{address || '—'}</span>
          </div>
          <div className="info-item">
            <span className="label">Unit SQ FT:</span>
            <span className="value">{unitSquareFeet || '—'}</span>
          </div>
          <div className="info-item">
            <span className="label">Unit Layout:</span>
            <span className="value">{unitLayout || '—'}</span>
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
                  <th>Item</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Multiplier</th>
                  <th>Price Per Unit</th>
                  <th>Total</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {workItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={`badge ${item.category.replace(/\s+/g, '-').toLowerCase()}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="item-name">{item.item || '—'}</td>
                    <td>{item.description || '—'}</td>
                    <td><span className="unit-badge">{item.unit || '—'}</span></td>
                    <td className="numeric">{item.multiplier || '—'}</td>
                    <td className="numeric">
                      {item.pricePerUnit ? formatPrice(item.pricePerUnit, item.materialsCost) : '—'}
                    </td>
                    <td className="total">
                      {item.total ? `$${item.total.toFixed(2)}` : '—'}
                    </td>
                    <td className="notes-cell">{item.notes || '—'}</td>
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
        
        .badge.painting {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .badge.floor-&-molding {
          background: #f3e5f5;
          color: #7b1fa2;
        }
        
        .badge.doors-&-windows {
          background: #fff3e0;
          color: #e65100;
        }
        
        .badge.clean-up {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .badge.plumbing-installation,
        .badge.plumbing-repairs {
          background: #e1f5fe;
          color: #0277bd;
        }
        
        .badge.electrical-installation {
          background: #fff9c4;
          color: #f57f17;
        }
        
        .badge.outlets-no-wiring,
        .badge.light-switch-no-wiring {
          background: #fce4ec;
          color: #c2185b;
        }
        
        .badge.other {
          background: #f5f5f5;
          color: #616161;
        }
        
        .item-name {
          font-weight: 500;
          max-width: 200px;
        }
        
        .unit-badge {
          display: inline-block;
          padding: 2px 6px;
          background: #f5f5f5;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          color: #666;
        }
        
        .numeric {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        
        .notes-cell {
          max-width: 250px;
          font-size: 13px;
          color: #666;
          line-height: 1.4;
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
        
      `}</style>
    </div>
  );
}


import { useState, useEffect, useRef } from 'react';
import { PRICING_CATALOG, getCategories, findPricing } from '../lib/pricingCatalog';

const CATEGORIES = getCategories();
const UNITS = ['SF', 'LF', 'EA', 'SET'];
const DESCRIPTIONS = ['Clean', 'Paint', 'Install', 'Remove & Install', 'Demolition', 'Repair', 'Repairs', 'Refinish', 'Other'];

export default function TableEditor({ isOpen, onClose, workItems, onSave }) {
  const [editedItems, setEditedItems] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const tableRef = useRef(null);

  // Initialize with current work items when opened
  useEffect(() => {
    if (isOpen) {
      setEditedItems(workItems.map(item => ({ ...item })));
      setSelectedCell(null);
    }
  }, [isOpen, workItems]);

  if (!isOpen) return null;

  const handleCellChange = (rowIndex, field, value) => {
    const newItems = [...editedItems];
    newItems[rowIndex] = { ...newItems[rowIndex], [field]: value };
    
    // Auto-calculate total when amount or pricePerUnit changes
    if (field === 'multiplier' || field === 'pricePerUnit') {
      const amount = field === 'multiplier' ? Number(value) : Number(newItems[rowIndex].multiplier);
      const price = field === 'pricePerUnit' ? Number(value) : Number(newItems[rowIndex].pricePerUnit);
      newItems[rowIndex].total = amount * price;
    }
    
    // Auto-lookup price when category, item, or description changes
    if (field === 'category' || field === 'item' || field === 'description') {
      const pricing = findPricing(
        field === 'category' ? value : newItems[rowIndex].category,
        field === 'item' ? value : newItems[rowIndex].item,
        field === 'description' ? value : newItems[rowIndex].description
      );
      if (pricing) {
        newItems[rowIndex].pricePerUnit = pricing.pricePerUnit;
        newItems[rowIndex].unit = pricing.unit;
        newItems[rowIndex].materialsCost = pricing.materialsCost || false;
        // Recalculate total
        newItems[rowIndex].total = Number(newItems[rowIndex].multiplier || 0) * pricing.pricePerUnit;
      }
    }
    
    setEditedItems(newItems);
  };

  const handleAddRow = () => {
    const newRow = {
      id: `new-${Date.now()}`,
      category: CATEGORIES[0],
      item: '',
      description: DESCRIPTIONS[0],
      unit: UNITS[0],
      multiplier: 1,
      pricePerUnit: 0,
      total: 0,
      notes: '',
      materialsCost: false
    };
    setEditedItems([...editedItems, newRow]);
  };

  const handleDeleteRow = (rowIndex) => {
    if (editedItems.length <= 1) {
      alert('Must have at least one work item');
      return;
    }
    const newItems = editedItems.filter((_, idx) => idx !== rowIndex);
    setEditedItems(newItems);
  };

  const handleSave = () => {
    // Validate and clean up data
    const validItems = editedItems.filter(item => 
      item.category && item.item && item.multiplier > 0
    ).map((item, idx) => ({
      ...item,
      id: item.id || String(idx + 1),
      multiplier: Number(item.multiplier) || 0,
      pricePerUnit: Number(item.pricePerUnit) || 0,
      total: Number(item.total) || (Number(item.multiplier) * Number(item.pricePerUnit))
    }));
    
    onSave(validItems);
    onClose();
  };

  const getItemsForCategory = (category) => {
    const items = PRICING_CATALOG[category] || [];
    // Get unique item names
    const uniqueItems = [...new Set(items.map(i => i.item))];
    return uniqueItems;
  };

  const grandTotal = editedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Work Items</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          <div className="table-wrapper" ref={tableRef}>
            <table>
              <thead>
                <tr>
                  <th className="col-category">Category</th>
                  <th className="col-item">Item</th>
                  <th className="col-desc">Description</th>
                  <th className="col-unit">Unit</th>
                  <th className="col-amount">Amount</th>
                  <th className="col-price">Price/Unit</th>
                  <th className="col-total">Total</th>
                  <th className="col-notes">Notes</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {editedItems.map((item, rowIndex) => (
                  <tr key={item.id || rowIndex}>
                    <td className="col-category">
                      <select
                        value={item.category || ''}
                        onChange={e => handleCellChange(rowIndex, 'category', e.target.value)}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="col-item">
                      <select
                        value={item.item || ''}
                        onChange={e => handleCellChange(rowIndex, 'item', e.target.value)}
                      >
                        <option value="">Select item...</option>
                        {getItemsForCategory(item.category).map(itemName => (
                          <option key={itemName} value={itemName}>{itemName}</option>
                        ))}
                      </select>
                    </td>
                    <td className="col-desc">
                      <select
                        value={item.description || ''}
                        onChange={e => handleCellChange(rowIndex, 'description', e.target.value)}
                      >
                        {DESCRIPTIONS.map(desc => (
                          <option key={desc} value={desc}>{desc}</option>
                        ))}
                      </select>
                    </td>
                    <td className="col-unit">
                      <select
                        value={item.unit || ''}
                        onChange={e => handleCellChange(rowIndex, 'unit', e.target.value)}
                      >
                        {UNITS.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                    <td className="col-amount">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.multiplier || ''}
                        onChange={e => handleCellChange(rowIndex, 'multiplier', e.target.value)}
                      />
                    </td>
                    <td className="col-price">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.pricePerUnit || ''}
                        onChange={e => handleCellChange(rowIndex, 'pricePerUnit', e.target.value)}
                      />
                    </td>
                    <td className="col-total">
                      <span className="total-value">${(item.total || 0).toFixed(2)}</span>
                    </td>
                    <td className="col-notes">
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={e => handleCellChange(rowIndex, 'notes', e.target.value)}
                        placeholder="Notes..."
                      />
                    </td>
                    <td className="col-actions">
                      <button 
                        className="delete-row-btn"
                        onClick={() => handleDeleteRow(rowIndex)}
                        title="Delete row"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="6" className="total-label">Grand Total</td>
                  <td className="grand-total">${grandTotal.toFixed(2)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <button className="add-row-btn" onClick={handleAddRow}>
            ➕ Add Row
          </button>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Save Changes
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 95%;
          max-width: 1400px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 2px solid #e0e0e0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: #f0f0f0;
          color: #333;
        }

        .modal-body {
          flex: 1;
          overflow: auto;
          padding: 20px 24px;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th {
          background: #f5f5f5;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #555;
          border-bottom: 2px solid #ddd;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        td {
          padding: 8px;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #f9f9f9;
        }

        /* Column widths */
        .col-category { width: 140px; }
        .col-item { width: 200px; }
        .col-desc { width: 120px; }
        .col-unit { width: 70px; }
        .col-amount { width: 80px; }
        .col-price { width: 90px; }
        .col-total { width: 90px; }
        .col-notes { min-width: 150px; }
        .col-actions { width: 50px; }

        select, input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
        }

        select:focus, input:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
        }

        input[type="number"] {
          text-align: right;
        }

        .total-value {
          font-weight: 600;
          color: #333;
          display: block;
          text-align: right;
          padding: 8px;
        }

        .delete-row-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          opacity: 0.6;
        }

        .delete-row-btn:hover {
          background: #ffebee;
          opacity: 1;
        }

        tfoot td {
          background: #f5f5f5;
          padding: 12px 8px;
          font-weight: 600;
        }

        .total-label {
          text-align: right;
          color: #555;
        }

        .grand-total {
          color: #4CAF50;
          font-size: 16px;
          text-align: right;
        }

        .add-row-btn {
          margin-top: 16px;
          padding: 12px 20px;
          background: #e8f5e9;
          border: 2px dashed #4CAF50;
          border-radius: 6px;
          color: #4CAF50;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          font-size: 14px;
          transition: all 0.2s;
        }

        .add-row-btn:hover {
          background: #c8e6c9;
          border-style: solid;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 2px solid #e0e0e0;
          background: #fafafa;
          border-radius: 0 0 12px 12px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #e0e0e0;
          color: #555;
        }

        .btn-secondary:hover {
          background: #d0d0d0;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background: #45a049;
        }

        @media (max-width: 768px) {
          .modal-content {
            width: 100%;
            height: 100%;
            max-height: 100%;
            border-radius: 0;
          }

          .col-notes {
            min-width: 100px;
          }
        }
      `}</style>
    </div>
  );
}


import { useRef, useState, useEffect } from 'react';

export default function SketchCanvas({ sketch, onSketchChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState('pen'); // pen, eraser

  useEffect(() => {
    // Load existing sketch if provided
    if (sketch && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = sketch;
    }
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left || e.touches?.[0]?.clientX - rect.left;
    const y = e.clientY - rect.top || e.touches?.[0]?.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left || e.touches?.[0]?.clientX - rect.left;
    const y = e.clientY - rect.top || e.touches?.[0]?.clientY - rect.top;

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      saveSketch();
    }
  };

  const saveSketch = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSketchChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSketchChange(null);
  };

  const colors = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFA500', '#800080'];
  const tools = [
    { id: 'pen', icon: '✏️', label: 'Pen' },
    { id: 'eraser', icon: '🧹', label: 'Eraser' }
  ];

  return (
    <div className="sketch-canvas">
      <div className="sketch-info">
        ℹ️ Your floor plan will be uploaded to Google Drive when you submit. Draw freely without worrying about file size!
      </div>
      
      <div className="toolbar">
        <div className="tool-group">
          <label className="tool-label">Tool:</label>
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`tool-button ${tool === t.id ? 'active' : ''}`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="tool-group">
          <label className="tool-label">Color:</label>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`color-button ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>

        <div className="tool-group">
          <label className="tool-label">Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="size-slider"
          />
          <span className="size-value">{lineWidth}px</span>
        </div>

        <button onClick={clearCanvas} className="clear-button">
          🗑️ Clear
        </button>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="canvas"
        />
        <div className="canvas-hint">
          Draw your floor plan here. Use different colors for walls, doors, windows, etc.
        </div>
      </div>

      <style jsx>{`
        .sketch-canvas {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .sketch-info {
          padding: 12px;
          background: #e3f2fd;
          border-left: 4px solid #2196F3;
          border-radius: 6px;
          color: #1565c0;
          font-size: 14px;
        }

        .toolbar {
          display: flex;
          gap: 20px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          flex-wrap: wrap;
          align-items: center;
        }

        .tool-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .tool-label {
          font-size: 14px;
          font-weight: 600;
          color: #555;
        }

        .tool-button {
          padding: 8px 12px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tool-button:hover {
          border-color: #2196F3;
        }

        .tool-button.active {
          border-color: #2196F3;
          background: #e3f2fd;
        }

        .color-button {
          width: 32px;
          height: 32px;
          border: 3px solid #e0e0e0;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-button:hover {
          transform: scale(1.1);
        }

        .color-button.active {
          border-color: #2196F3;
          border-width: 3px;
          transform: scale(1.15);
        }

        .size-slider {
          width: 100px;
        }

        .size-value {
          font-size: 14px;
          color: #666;
          min-width: 40px;
        }

        .clear-button {
          padding: 8px 16px;
          border: 2px solid #f44336;
          background: white;
          color: #f44336;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: auto;
        }

        .clear-button:hover {
          background: #f44336;
          color: white;
        }

        .canvas-container {
          position: relative;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 16px;
        }

        .canvas {
          width: 100%;
          height: auto;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          cursor: crosshair;
          touch-action: none;
          background: white;
        }

        .canvas-hint {
          margin-top: 12px;
          font-size: 14px;
          color: #666;
          font-style: italic;
          text-align: center;
        }

        @media (max-width: 768px) {
          .toolbar {
            gap: 12px;
          }

          .tool-group {
            flex-wrap: wrap;
          }

          .canvas {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}


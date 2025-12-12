import { useRef, useState, useEffect, useCallback } from 'react';

const MAX_HISTORY = 50; // Limit history to prevent memory issues

export default function SketchCanvas({ sketch, onSketchChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState('pen'); // pen, eraser
  const [showStraightenHint, setShowStraightenHint] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // For shape recognition
  const strokePointsRef = useRef([]);
  const canvasStateBeforeStrokeRef = useRef(null);
  const holdTimerRef = useRef(null);
  const straightenedRef = useRef(false);
  
  // For undo/redo
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);

  useEffect(() => {
    // Load existing sketch if provided
    if (sketch && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        // Save initial state to history
        saveToHistory();
      };
      img.src = sketch;
    } else if (canvasRef.current) {
      // Save blank canvas as initial state
      saveToHistory();
    }
  }, []);
  
  // Save current canvas state to history
  const saveToHistory = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    historyRef.current.push(imageData);
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    
    // Clear redo stack when new action is taken
    redoStackRef.current = [];
    
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(false);
  }, []);
  
  // Undo last stroke
  const undo = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Pop current state and push to redo
    const currentState = historyRef.current.pop();
    redoStackRef.current.push(currentState);
    
    // Restore previous state
    const previousState = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(previousState, 0, 0);
    
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(true);
    
    // Save the restored state
    const dataUrl = canvas.toDataURL('image/png');
    onSketchChange(dataUrl);
  }, [onSketchChange]);
  
  // Redo undone stroke
  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Pop from redo and push to history
    const redoState = redoStackRef.current.pop();
    historyRef.current.push(redoState);
    
    // Restore redo state
    ctx.putImageData(redoState, 0, 0);
    
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    
    // Save the restored state
    const dataUrl = canvas.toDataURL('image/png');
    onSketchChange(dataUrl);
  }, [onSketchChange]);

  // Get properly scaled coordinates accounting for CSS scaling
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get the client position (mouse or touch)
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    
    if (clientX === undefined || clientY === undefined) return null;
    
    // Calculate the scale factor between displayed size and internal size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Apply scale to get correct canvas coordinates
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  // Analyze if stroke is close to a straight line
  const isLineLike = useCallback((points) => {
    if (points.length < 5) return false;
    
    const start = points[0];
    const end = points[points.length - 1];
    const lineLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    // Too short to straighten
    if (lineLength < 30) return false;
    
    // Calculate average distance from line
    let totalDeviation = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      // Distance from point to line (start to end)
      const deviation = Math.abs(
        (end.y - start.y) * point.x - 
        (end.x - start.x) * point.y + 
        end.x * start.y - 
        end.y * start.x
      ) / lineLength;
      totalDeviation += deviation;
    }
    
    const avgDeviation = totalDeviation / (points.length - 2);
    // If average deviation is less than 15px, consider it a line
    return avgDeviation < 15;
  }, []);

  // Draw a straight line from start to end
  const drawStraightLine = useCallback((start, end, strokeColor, width) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, []);

  // Straighten the current stroke
  const straightenStroke = useCallback(() => {
    const points = strokePointsRef.current;
    if (points.length < 2 || straightenedRef.current) return;
    
    if (isLineLike(points)) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Restore canvas to state before this stroke
      if (canvasStateBeforeStrokeRef.current) {
        ctx.putImageData(canvasStateBeforeStrokeRef.current, 0, 0);
      }
      
      // Draw straight line
      const start = points[0];
      const end = points[points.length - 1];
      drawStraightLine(start, end, color, lineWidth);
      
      straightenedRef.current = true;
      setShowStraightenHint(true);
      setTimeout(() => setShowStraightenHint(false), 1000);
    }
  }, [color, lineWidth, isLineLike, drawStraightLine]);

  const startDrawing = (e) => {
    e.preventDefault(); // Prevent scrolling on touch
    const coords = getCoordinates(e);
    if (!coords) return;
    
    // Save canvas state before this stroke
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvasStateBeforeStrokeRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Reset stroke tracking
    strokePointsRef.current = [coords];
    straightenedRef.current = false;
    
    setIsDrawing(true);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch
    
    const coords = getCoordinates(e);
    if (!coords) return;
    
    // Track points for shape recognition
    strokePointsRef.current.push(coords);
    
    // Reset hold timer on movement
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    
    // Start hold timer - if user holds for 400ms, try to straighten
    holdTimerRef.current = setTimeout(() => {
      if (isDrawing && tool === 'pen') {
        straightenStroke();
      }
    }, 400);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    // Clear hold timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      // Reset stroke data
      strokePointsRef.current = [];
      canvasStateBeforeStrokeRef.current = null;
      // Save to history for undo/redo
      saveToHistory();
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
    saveToHistory();
    onSketchChange(null);
  };

  const colors = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFA500', '#800080'];
  const tools = [
    { id: 'pen', icon: '✏️', label: 'Pen' },
    { id: 'eraser', icon: null, label: 'Eraser', customIcon: true }
  ];

  return (
    <div className="sketch-canvas">
      <div className="sketch-info">
        ✏️ Draw your floor plan. <strong>Hold at end of line</strong> to auto-straighten!
      </div>
      
      {showStraightenHint && (
        <div className="straighten-hint">
          📐 Line straightened!
        </div>
      )}
      
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
              {t.customIcon ? (
                <span className="eraser-icon"></span>
              ) : (
                t.icon
              )}
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

        <div className="tool-group history-buttons">
          <button 
            onClick={undo} 
            disabled={!canUndo}
            className="history-button"
            title="Undo (Ctrl+Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/>
              <path d="M3 13a9 9 0 1 0 3-7.7L3 7"/>
            </svg>
            Undo
          </button>
          <button 
            onClick={redo} 
            disabled={!canRedo}
            className="history-button"
            title="Redo (Ctrl+Y)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/>
              <path d="M21 13a9 9 0 1 1-3-7.7L21 7"/>
            </svg>
            Redo
          </button>
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
          className={`canvas ${tool === 'eraser' ? 'eraser-cursor' : ''}`}
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
        
        .straighten-hint {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          background: #4CAF50;
          color: white;
          border-radius: 30px;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 1000;
          animation: fadeInOut 1s ease-in-out;
        }
        
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
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
        
        .eraser-icon {
          display: inline-block;
          width: 20px;
          height: 14px;
          background: linear-gradient(135deg, #f8bbd9 0%, #f48fb1 100%);
          border-radius: 3px;
          border: 1px solid #e91e63;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,0.1);
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

        .history-buttons {
          margin-left: auto;
        }
        
        .history-button {
          padding: 8px 12px;
          border: 2px solid #9e9e9e;
          background: white;
          color: #666;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .history-button svg {
          flex-shrink: 0;
        }
        
        .history-button:hover:not(:disabled) {
          border-color: #2196F3;
          color: #2196F3;
          background: #e3f2fd;
        }
        
        .history-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
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
        
        .canvas.eraser-cursor {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='%23e91e63' stroke-width='2'/%3E%3Ccircle cx='12' cy='12' r='8' fill='%23f8bbd9' fill-opacity='0.5'/%3E%3C/svg%3E") 12 12, auto;
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


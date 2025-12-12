import { useState, useEffect, useRef } from 'react';

export default function VoiceRecorder({ onTranscript, onRecordingChange, disabled, language = 'en' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const languageRef = useRef(language);
  const accumulatedTranscriptRef = useRef('');

  // Update language ref when prop changes
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        // Accumulate final results (don't send yet - wait for user to stop)
        if (final) {
          accumulatedTranscriptRef.current += final;
          setCurrentTranscript(accumulatedTranscriptRef.current);
        }
        
        // Show interim results
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // On no-speech, just restart silently if still recording
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Don't stop - let user continue when ready
          if (recognitionRef.current && isRecording) {
            try {
              recognition.start();
            } catch (e) {
              // Already started
            }
          }
        } else if (event.error !== 'aborted') {
          // Real error - stop recording
          setIsRecording(false);
          onRecordingChange(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still supposed to be recording
        // This keeps the mic open even during pauses
        if (isRecording) {
          try {
            recognition.start();
          } catch (error) {
            // Already running or other issue
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, []);

  // Track isRecording changes for the onend handler
  useEffect(() => {
    // Store in a way the event handlers can access
    if (recognitionRef.current) {
      recognitionRef.current._isRecording = isRecording;
    }
  }, [isRecording]);

  // Update parent when recording state changes
  useEffect(() => {
    onRecordingChange(isRecording);
  }, [isRecording, onRecordingChange]);

  const startRecording = () => {
    if (!recognitionRef.current || disabled) return;

    try {
      // Reset accumulated transcript
      accumulatedTranscriptRef.current = '';
      setCurrentTranscript('');
      setInterimTranscript('');
      
      // Set language before starting
      const langCode = languageRef.current === 'es' ? 'es-ES' : 'en-US';
      recognitionRef.current.lang = langCode;
      
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopAndSubmit = () => {
    if (!recognitionRef.current) return;

    try {
      setIsRecording(false);
      recognitionRef.current.stop();
      
      // Get the accumulated transcript
      const finalTranscript = accumulatedTranscriptRef.current.trim();
      
      // Submit if we have content
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
      
      // Reset
      accumulatedTranscriptRef.current = '';
      setCurrentTranscript('');
      setInterimTranscript('');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const cancelRecording = () => {
    if (!recognitionRef.current) return;

    try {
      setIsRecording(false);
      recognitionRef.current.stop();
      
      // Reset without submitting
      accumulatedTranscriptRef.current = '';
      setCurrentTranscript('');
      setInterimTranscript('');
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  if (!isSupported) {
    return (
      <div className="voice-unsupported">
        <p>⚠️ Voice recognition not supported in this browser</p>
        <style jsx>{`
          .voice-unsupported {
            padding: 12px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            color: #856404;
            font-size: 14px;
          }
          .voice-unsupported p {
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="voice-recorder">
      {!isRecording ? (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="voice-button start"
          title="Start recording"
        >
          🎤 Voice
        </button>
      ) : (
        <div className="recording-controls">
          <div className="recording-indicator">
            <span className="pulse"></span>
            <span className="recording-text">Recording...</span>
          </div>
          
          <div className="recording-buttons">
            <button
              type="button"
              onClick={cancelRecording}
              className="voice-button cancel"
              title="Cancel recording"
            >
              ✕ Cancel
            </button>
            <button
              type="button"
              onClick={stopAndSubmit}
              className="voice-button submit"
              title="Stop and submit"
            >
              ✓ Done
            </button>
          </div>
        </div>
      )}

      {isRecording && (currentTranscript || interimTranscript) && (
        <div className="transcript-preview">
          <div className="transcript-label">What I heard:</div>
          <div className="transcript-text">
            {currentTranscript}
            {interimTranscript && (
              <span className="interim">{interimTranscript}</span>
            )}
          </div>
        </div>
      )}

      {isRecording && !currentTranscript && !interimTranscript && (
        <div className="waiting-hint">
          🎧 Listening... Take your time, speak when ready.
        </div>
      )}

      <style jsx>{`
        .voice-recorder {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .voice-button {
          padding: 12px 20px;
          border: 2px solid #2196F3;
          background: white;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #2196F3;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .voice-button.start:hover:not(:disabled) {
          background: #e3f2fd;
        }

        .voice-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .recording-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: #ffebee;
          border: 2px solid #f44336;
          border-radius: 8px;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
        }

        .pulse {
          width: 12px;
          height: 12px;
          background: #f44336;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        .recording-text {
          font-weight: 600;
          color: #c62828;
          font-size: 16px;
        }

        .recording-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .voice-button.cancel {
          background: white;
          border-color: #9e9e9e;
          color: #666;
          flex: 1;
        }

        .voice-button.cancel:hover {
          background: #f5f5f5;
          border-color: #666;
        }

        .voice-button.submit {
          background: #4CAF50;
          border-color: #4CAF50;
          color: white;
          flex: 1;
        }

        .voice-button.submit:hover {
          background: #43a047;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        .transcript-preview {
          padding: 12px;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
        }

        .transcript-label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .transcript-text {
          font-size: 14px;
          color: #333;
          line-height: 1.5;
        }

        .interim {
          color: #999;
          font-style: italic;
        }

        .waiting-hint {
          padding: 12px;
          background: #e3f2fd;
          border-radius: 6px;
          color: #1565c0;
          font-size: 14px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}


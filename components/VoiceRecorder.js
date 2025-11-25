import { useState, useEffect, useRef } from 'react';

export default function VoiceRecorder({ onTranscript, onRecordingChange, disabled, language = 'en' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const languageRef = useRef(language);

  // Update language ref when prop changes
  useEffect(() => {
    languageRef.current = language;
    
    // Restart recognition if language changed while recording
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setTimeout(() => {
        if (isRecording) {
          startRecording();
        }
      }, 100);
    }
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
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update local state with interim results
        if (interimTranscript) {
          setTranscript(interimTranscript);
        }

        // Send final results to parent
        if (finalTranscript) {
          setTranscript('');
          onTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Auto-restart if no speech detected
          if (isRecording) {
            recognition.start();
          }
        } else {
          setIsRecording(false);
          onRecordingChange(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still supposed to be recording
        if (isRecording) {
          try {
            recognition.start();
          } catch (error) {
            console.error('Failed to restart recognition:', error);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update parent when recording state changes
  useEffect(() => {
    onRecordingChange(isRecording);
  }, [isRecording, onRecordingChange]);

  const startRecording = () => {
    if (!recognitionRef.current || disabled) return;

    try {
      // Set language before starting
      const langCode = languageRef.current === 'es' ? 'es-ES' : 'en-US';
      recognitionRef.current.lang = langCode;
      
      recognitionRef.current.start();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
      setIsRecording(false);
      setTranscript('');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        className={`voice-button ${isRecording ? 'recording' : ''}`}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <>
            <span className="pulse"></span>
            🎤 Recording...
          </>
        ) : (
          <>🎤 Voice</>
        )}
      </button>

      {transcript && (
        <div className="interim-transcript">
          <span className="label">Listening:</span> {transcript}
        </div>
      )}

      <style jsx>{`
        .voice-recorder {
          position: relative;
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
          gap: 8px;
          position: relative;
        }

        .voice-button:hover:not(:disabled) {
          background: #e3f2fd;
        }

        .voice-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .voice-button.recording {
          background: #f44336;
          color: white;
          border-color: #f44336;
          animation: glow 1.5s infinite;
        }

        .pulse {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(244, 67, 54, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(244, 67, 54, 0.8);
          }
        }

        .interim-transcript {
          margin-top: 8px;
          padding: 8px 12px;
          background: #e3f2fd;
          border-radius: 6px;
          font-size: 14px;
          color: #1565c0;
        }

        .label {
          font-weight: 600;
          margin-right: 4px;
        }
      `}</style>
    </div>
  );
}


import { useState, useEffect, useRef, useCallback } from 'react';

export default function VoiceRecorder({ onTranscript, onLiveTranscript, onRecordingChange, disabled, language = 'en' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const languageRef = useRef(language);
  const accumulatedTranscriptRef = useRef('');
  const isRecordingRef = useRef(false); // Ref to avoid stale closure issues

  // Keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Update language ref when prop changes
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Stable callback refs to avoid stale closures
  const onTranscriptRef = useRef(onTranscript);
  const onLiveTranscriptRef = useRef(onLiveTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onLiveTranscriptRef.current = onLiveTranscript;
  }, [onTranscript, onLiveTranscript]);

  const finishRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    
    isRecordingRef.current = false;
    setIsRecording(false);
    
    // Send final transcript to parent
    const finalTranscript = accumulatedTranscriptRef.current.trim();
    if (finalTranscript && onTranscriptRef.current) {
      onTranscriptRef.current(finalTranscript);
    }
    
    // Clear live transcript
    if (onLiveTranscriptRef.current) {
      onLiveTranscriptRef.current('');
    }
    
    // Reset
    accumulatedTranscriptRef.current = '';
  }, []);

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
      recognition.interimResults = true; // Enable interim results for live display

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

        // Accumulate final results
        if (final) {
          accumulatedTranscriptRef.current += final;
        }
        
        // Send live update (accumulated + interim) for display
        if (onLiveTranscriptRef.current) {
          const liveText = (accumulatedTranscriptRef.current + interim).trim();
          onLiveTranscriptRef.current(liveText);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          finishRecording();
        }
      };

      recognition.onend = () => {
        // When recognition ends, finish up and send transcript
        finishRecording();
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
  }, [finishRecording]);

  // Track isRecording changes
  useEffect(() => {
    onRecordingChange(isRecording);
  }, [isRecording, onRecordingChange]);

  const toggleRecording = () => {
    if (!recognitionRef.current || disabled) return;

    if (isRecordingRef.current) {
      // Stop recording
      try {
        recognitionRef.current.stop();
        // onend will call finishRecording
      } catch (error) {
        console.error('Failed to stop recording:', error);
        finishRecording();
      }
    } else {
      // Start recording
      try {
        accumulatedTranscriptRef.current = '';
        if (onLiveTranscriptRef.current) {
          onLiveTranscriptRef.current('');
        }
        
        // Set language before starting
        const langCode = languageRef.current === 'es' ? 'es-ES' : 'en-US';
        recognitionRef.current.lang = langCode;
        
        recognitionRef.current.start();
        isRecordingRef.current = true;
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="voice-unsupported">
        <p>⚠️ Voice not supported</p>
        <style jsx>{`
          .voice-unsupported {
            padding: 8px 12px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            color: #856404;
            font-size: 12px;
          }
          .voice-unsupported p {
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleRecording}
      onTouchEnd={(e) => {
        // Prevent ghost clicks on touch devices
        e.preventDefault();
        toggleRecording();
      }}
      disabled={disabled}
      className={`voice-button ${isRecording ? 'recording' : ''}`}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? '⏹️ Stop' : '🎤 Voice'}
      
      <style jsx>{`
        .voice-button {
          padding: 16px 24px;
          border: 2px solid #2196F3;
          background: white;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          color: #2196F3;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 120px;
          min-height: 52px;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .voice-button:hover:not(:disabled):not(.recording) {
          background: #e3f2fd;
          transform: scale(1.02);
        }
        
        .voice-button:active:not(:disabled) {
          transform: scale(0.97);
        }

        .voice-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .voice-button.recording {
          background: #f44336;
          border-color: #f44336;
          color: white;
          animation: pulse-bg 1.5s infinite;
        }
        
        .voice-button.recording:hover {
          background: #d32f2f;
          border-color: #d32f2f;
        }
        
        .voice-button.recording:active {
          background: #c62828;
          transform: scale(0.97);
        }
        
        @keyframes pulse-bg {
          0%, 100% { background: #f44336; }
          50% { background: #ef5350; }
        }
      `}</style>
    </button>
  );
}

import { useState, useEffect, useRef } from 'react';

export default function VoiceRecorder({ onTranscript, onRecordingChange, disabled, language = 'en' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
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
      recognition.interimResults = false; // Only final results for simplicity

      recognition.onresult = (event) => {
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          }
        }

        // Accumulate final results
        if (final) {
          accumulatedTranscriptRef.current += final;
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // On no-speech or aborted, just stop gracefully
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Stop recording
          finishRecording();
        } else {
          // Real error - stop recording
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
  }, []);

  // Track isRecording changes
  useEffect(() => {
    onRecordingChange(isRecording);
  }, [isRecording, onRecordingChange]);

  const finishRecording = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    
    // Send accumulated transcript to parent
    const finalTranscript = accumulatedTranscriptRef.current.trim();
    if (finalTranscript) {
      onTranscript(finalTranscript);
    }
    
    // Reset
    accumulatedTranscriptRef.current = '';
  };

  const toggleRecording = () => {
    if (!recognitionRef.current || disabled) return;

    if (isRecording) {
      // Stop recording
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recording:', error);
        finishRecording();
      }
    } else {
      // Start recording
      try {
        accumulatedTranscriptRef.current = '';
        
        // Set language before starting
        const langCode = languageRef.current === 'es' ? 'es-ES' : 'en-US';
        recognitionRef.current.lang = langCode;
        
        recognitionRef.current.start();
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
      disabled={disabled}
      className={`voice-button ${isRecording ? 'recording' : ''}`}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? '⏹️ Stop' : '🎤 Voice'}
      
      <style jsx>{`
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
          min-width: 100px;
        }

        .voice-button:hover:not(:disabled):not(.recording) {
          background: #e3f2fd;
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
        
        @keyframes pulse-bg {
          0%, 100% { background: #f44336; }
          50% { background: #e53935; }
        }
      `}</style>
    </button>
  );
}

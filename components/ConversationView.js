import { useEffect, useRef } from 'react';
import { speak, stopSpeaking } from '../lib/tts';

export default function ConversationView({ history, enableTTS = true, ttsLanguage = 'en' }) {
  const lastMessageRef = useRef(null);
  const processedMessagesRef = useRef(new Set());

  useEffect(() => {
    // Auto-scroll to latest message
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    // Speak assistant messages
    if (enableTTS && history.length > 0) {
      const lastMessage = history[history.length - 1];
      const messageKey = `${history.length - 1}-${lastMessage.content}`;
      
      if (lastMessage.role === 'assistant' && !processedMessagesRef.current.has(messageKey)) {
        processedMessagesRef.current.add(messageKey);
        const langCode = ttsLanguage === 'es' ? 'es-ES' : 'en-US';
        speak(lastMessage.content, { rate: 1.1, lang: langCode });
      }
    }
  }, [history, enableTTS, ttsLanguage]);

  useEffect(() => {
    // Cleanup: stop speaking when component unmounts
    return () => {
      stopSpeaking();
    };
  }, []);

  if (history.length === 0) {
    return (
      <div className="conversation-empty">
        <p>Start by describing the work needed at the job site.</p>
        <style jsx>{`
          .conversation-empty {
            padding: 40px;
            text-align: center;
            color: #666;
            font-style: italic;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="conversation-view">
      <h3>Conversation</h3>
      <div className="messages">
        {history.map((msg, idx) => (
          <div 
            key={idx} 
            className={`message ${msg.role}`}
            ref={idx === history.length - 1 ? lastMessageRef : null}
          >
            <div className="message-label">
              {msg.role === 'user' ? 'You' : 'Assistant'}
              {msg.role === 'assistant' && enableTTS && (
                <span className="speaker-icon" title="Speaking enabled">🔊</span>
              )}
            </div>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .conversation-view {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-height: 400px;
          overflow-y: auto;
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 16px;
          color: #333;
        }
        
        .messages {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .message {
          padding: 12px;
          border-radius: 6px;
        }
        
        .message.user {
          background: #e3f2fd;
          margin-left: 20px;
        }
        
        .message.assistant {
          background: #f5f5f5;
          margin-right: 20px;
        }
        
        .message-label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .speaker-icon {
          font-size: 14px;
        }
        
        .message-content {
          color: #333;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}


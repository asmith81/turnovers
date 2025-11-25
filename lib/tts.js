/**
 * Text-to-Speech utilities using Web Speech API
 */

let speechSynthesis = null;
let currentUtterance = null;

if (typeof window !== 'undefined') {
  speechSynthesis = window.speechSynthesis;
}

/**
 * Speak text using browser's text-to-speech
 * @param {string} text - Text to speak
 * @param {object} options - Options for speech
 * @returns {Promise} Resolves when speech is complete
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!speechSynthesis) {
      console.warn('Text-to-speech not supported in this browser');
      resolve();
      return;
    }

    // Cancel any ongoing speech
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = options.rate || 1.0; // Speed (0.1 to 10)
    utterance.pitch = options.pitch || 1.0; // Pitch (0 to 2)
    utterance.volume = options.volume || 1.0; // Volume (0 to 1)
    utterance.lang = options.lang || 'en-US'; // Language

    // Try to find a voice for the specified language
    const voices = speechSynthesis.getVoices();
    
    if (options.voiceName) {
      // Specific voice requested
      const voice = voices.find(v => v.name === options.voiceName);
      if (voice) {
        utterance.voice = voice;
      }
    } else if (options.lang) {
      // Find a voice that matches the language
      const langVoice = voices.find(v => v.lang.startsWith(options.lang.split('-')[0]));
      if (langVoice) {
        utterance.voice = langVoice;
      }
    }

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      currentUtterance = null;
      reject(event);
    };

    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking() {
  if (speechSynthesis && speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

/**
 * Check if currently speaking
 * @returns {boolean}
 */
export function isSpeaking() {
  return speechSynthesis && speechSynthesis.speaking;
}

/**
 * Get available voices
 * @returns {Array} Array of available voice objects
 */
export function getAvailableVoices() {
  if (!speechSynthesis) {
    return [];
  }
  return speechSynthesis.getVoices();
}

/**
 * Pause speaking
 */
export function pauseSpeaking() {
  if (speechSynthesis && speechSynthesis.speaking) {
    speechSynthesis.pause();
  }
}

/**
 * Resume speaking
 */
export function resumeSpeaking() {
  if (speechSynthesis && speechSynthesis.paused) {
    speechSynthesis.resume();
  }
}


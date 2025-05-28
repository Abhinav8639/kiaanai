import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@11labs/react';

const ELEVENLABS_API_KEY = 'sk_401ed908bf650d683b38bd0db10ff6507dbec057961bcbd4';

const Talk = ({ agentId }) => {
  const [messages, setMessages] = useState([]);
  const [isWaitingForMicPermission, setIsWaitingForMicPermission] = useState(false);
  const [error, setError] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [useTextFallback, setUseTextFallback] = useState(false);
  const reconnectAttempts = useRef(0);
  const chatHistoryRef = useRef(null);
  const micStreamRef = useRef(null);
  const isMountedRef = useRef(true);
  const processedMessages = useRef(new Set());
  const isStartingSessionRef = useRef(false);
  const audioContextRef = useRef(null);

  const conversation = useConversation({
    apiKey: ELEVENLABS_API_KEY,
    onMessage: (message) => {
      console.log('Received talk message:', message);
      const messageId = message.id || `${message.source}-${message.message}-${message.timestamp || Date.now()}`;
      if (processedMessages.current.has(messageId)) {
        console.log('Duplicate message detected, ignoring:', message.message);
        return;
      }
      processedMessages.current.add(messageId);

      if (message.source === 'assistant' || message.source === 'ai') {
        if (isMountedRef.current) {
          setMessages(prev => [...prev, { role: 'assistant', content: message.message }]);
        }
      } else if (message.source === 'user' && message.is_final) {
        if (isMountedRef.current) {
          setMessages(prev => [...prev, { role: 'user', content: message.message }]);
        }
      }
    },
    onError: (error) => {
      console.error('Talk error:', error);
      if (isMountedRef.current) {
        setError(`Talk error: ${error.message}`);
        setIsSessionActive(false);
        setIsWaitingForMicPermission(false);
        setUseTextFallback(true);
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
      }
    },
    onConnect: () => {
      console.log('Connected to ElevenLabs Talk');
      if (isMountedRef.current) {
        setError('');
        setIsSessionActive(true);
        setUseTextFallback(false);
        reconnectAttempts.current = 0;
        isStartingSessionRef.current = false;
        setMessages([]);
        processedMessages.current.clear();
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs Talk. Status:', conversation.status);
      if (isMountedRef.current) {
        setError('Disconnected from talk. Please try again or use text input.');
        setIsSessionActive(false);
        setUseTextFallback(true);
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
        isStartingSessionRef.current = false;
      }
    },
    onStatusChange: (newStatus) => {
      console.log('Conversation status changed:', newStatus);
    },
    onAudioStart: () => {
      console.log('Audio streaming started');
    },
    onAudioEnd: () => {
      console.log('Audio streaming ended');
    },
  });

  const { status, isSpeaking, sendTextMessage } = conversation;

  const verifyElevenLabsCredentials = async () => {
    try {
      console.log('Verifying ElevenLabs credentials for Talk...');
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });
      const data = await response.json();
      if (response.ok) {
        console.log('API key is valid for Talk. User data:', data);
      } else {
        console.error('API key validation failed for Talk:', data);
        if (isMountedRef.current) {
          setError('Invalid API key for Talk. Please check your ElevenLabs API key.');
          setUseTextFallback(true);
        }
      }
    } catch (err) {
      console.error('Error verifying API key for Talk:', err);
      if (isMountedRef.current) {
        setError('Failed to verify API key for Talk. Please check your network connection.');
        setUseTextFallback(true);
      }
    }
  };

  const initAudioContext = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('Audio context resumed for Talk');
        }).catch(err => {
          console.error('Error resuming audio context for Talk:', err);
        });
      }
      const oscillator = audioContextRef.current.createOscillator();
      oscillator.connect(audioContextRef.current.destination);
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.01);
      console.log('Audio context initialized for Talk');
    } catch (err) {
      console.error('Error initializing audio context for Talk:', err);
      if (isMountedRef.current) {
        setError('Failed to initialize audio context for Talk. Please try again.');
      }
    }
  };

  const getMicrophoneStream = async () => {
    if (micStreamRef.current) {
      const tracks = micStreamRef.current.getAudioTracks();
      if (tracks.length > 0 && tracks[0].enabled) {
        console.log('Reusing existing microphone stream for Talk. Active tracks:', tracks);
        return micStreamRef.current;
      } else {
        console.log('Existing microphone stream is invalid for Talk, requesting new one...');
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    }

    try {
      console.log('Requesting microphone permission for Talk...');
      if (isMountedRef.current) setIsWaitingForMicPermission(true);
      const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Microphone permission request timed out for Talk')), 10000)
      );
      const stream = await Promise.race([streamPromise, timeoutPromise]);
      console.log('Microphone permission granted for Talk. Active tracks:', stream.getAudioTracks());
      micStreamRef.current = stream;
      if (isMountedRef.current) setIsWaitingForMicPermission(false);
      return stream;
    } catch (err) {
      console.error('Error accessing microphone for Talk:', err);
      if (isMountedRef.current) {
        setError('Failed to access microphone for Talk: ' + err.message + '. Please enable microphone access or type your message below.');
        setIsWaitingForMicPermission(false);
        setUseTextFallback(true);
      }
      return null;
    }
  };

  const simulateFocusChange = () => {
    try {
      console.log('Simulating focus change to trigger session initialization for Talk...');
      const visibilityChangeEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityChangeEvent);
    } catch (err) {
      console.error('Error simulating focus change for Talk:', err);
    }
  };

  const handleStart = async (retryCount = 0, maxRetries = 3) => {
    if (isSessionActive || isWaitingForMicPermission || isStartingSessionRef.current) {
      console.log('Session already active, waiting for permission, or starting for Talk. Aborting start.');
      return;
    }

    try {
      isStartingSessionRef.current = true;
      console.log('Starting session attempt for Talk:', retryCount + 1);

      initAudioContext();

      if (status === 'connected') {
        console.log('Cleaning up existing session before starting new one for Talk...');
        await conversation.endSession();
      }

      const stream = await getMicrophoneStream();
      if (!stream) {
        console.log('No microphone stream available for Talk, proceeding with text fallback');
        isStartingSessionRef.current = false;
        return;
      }

      console.log('Starting ElevenLabs session for Talk with agent ID:', agentId);
      await conversation.startSession({
        agentId: agentId,
        audioStream: stream,
      });

      simulateFocusChange();
    } catch (error) {
      console.error('Error starting talk:', error);
      if (retryCount < maxRetries && isMountedRef.current) {
        const delay = Math.pow(2, retryCount) * 2000;
        console.log(`Retrying session start for Talk... Attempt: ${retryCount + 2}, Delay: ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        await handleStart(retryCount + 1, maxRetries);
      } else if (isMountedRef.current) {
        setError(`Failed to start talk after ${maxRetries} attempts: ${error.message}`);
        setIsWaitingForMicPermission(false);
        setIsSessionActive(false);
        setUseTextFallback(true);
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
      }
      isStartingSessionRef.current = false;
    }
  };

  const handleStop = async () => {
    try {
      console.log('Stopping ElevenLabs session for Talk...');
      await conversation.endSession();
      if (isMountedRef.current) {
        setMessages([]);
        setError('');
        setIsSessionActive(false);
        setUseTextFallback(false);
        setTextInput('');
        processedMessages.current.clear();
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error ending talk:', error);
      if (isMountedRef.current) {
        setError(`Failed to end talk: ${error.message}`);
      }
    }
  };

  const handleReconnect = async () => {
    if (reconnectAttempts.current >= 3) {
      if (isMountedRef.current) {
        setError('Too many reconnect attempts for Talk. Please try again later or use text input.');
        setUseTextFallback(true);
      }
      return;
    }
    if (status === 'disconnected' && !isWaitingForMicPermission && !isSessionActive && isMountedRef.current && !isStartingSessionRef.current) {
      console.log('Attempting to reconnect for Talk... Attempt:', reconnectAttempts.current + 1);
      reconnectAttempts.current += 1;
      if (isMountedRef.current) {
        setMessages([]);
        processedMessages.current.clear();
      }
      await handleStart();
    }
  };

  const handleTextSubmit = async () => {
    if (textInput.trim() && isMountedRef.current) {
      setMessages(prev => [...prev, { role: 'user', content: textInput }]);
      if (status === 'connected') {
        console.log('Sending text message to ElevenLabs for Talk:', textInput);
        try {
          await sendTextMessage(textInput);
        } catch (err) {
          console.error('Error sending text message for Talk:', err);
          setError('Failed to send text message for Talk: ' + err.message);
        }
      } else {
        console.log('Session disconnected for Talk, simulating response for:', textInput);
        const message = textInput.toLowerCase();
        let response = "I'm not sure how to help with that. Can you provide more details?";
        if (message.includes('account')) {
          response = "I can help with your account. What issue are you facing? Is it a login problem, or something else?";
        } else if (message.includes('hello') || message.includes('hi')) {
          response = "Hi there! How can I assist you today?";
        } else if (message.includes('login')) {
          response = "Having trouble logging in? Please check your username and password, or try resetting your password. Need more help?";
        } else if (message.includes('bye') || message.includes('goodbye')) {
          response = "Goodbye! If you need help later, feel free to come back.";
        }
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
      setTextInput('');
    }
  };

  const handleVisibilityChange = () => {
    try {
      if (document.hidden) {
        console.log('Document hidden - Pausing talk session');
        if (status === 'connected') {
          conversation.pauseSession?.();
        }
      } else {
        console.log('Document visible - Resuming talk session');
        if (status === 'disconnected' && messages.length > 0 && !isStartingSessionRef.current) {
          handleReconnect();
        }
      }
    } catch (err) {
      console.error('Error handling visibility change for Talk:', err);
    }
  };

  useEffect(() => {
    initAudioContext();
    handleStart(); // Auto-start the session when the Talk tab is opened
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    verifyElevenLabsCredentials();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (status === 'connected') {
        console.log('Cleaning up talk session on unmount');
        try {
          conversation.endSession();
        } catch (err) {
          console.error('Error ending session on unmount for Talk:', err);
        }
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.error('Error closing audio context for Talk:', err));
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, conversation]);

  useEffect(() => {
    let reconnectTimeout;
    if (status === 'disconnected' && messages.length > 0 && !isStartingSessionRef.current) {
      console.log('Scheduling reconnect attempt for Talk...');
      reconnectTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          handleReconnect();
        }
      }, 2000);
    }
    return () => clearTimeout(reconnectTimeout);
  }, [status, messages.length]);

  useEffect(() => {
    const resumeAudioContext = () => {
      try {
        if (status === 'connected' && document.visibilityState === 'visible') {
          console.log('Resuming audio context for Talk...');
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().then(() => {
              console.log('Audio context resumed on visibility change for Talk');
            });
          }
          conversation.resumeAudio?.();
        }
      } catch (err) {
        console.error('Error resuming audio context on visibility change for Talk:', err);
      }
    };
    document.addEventListener('visibilitychange', resumeAudioContext);
    return () => document.removeEventListener('visibilitychange', resumeAudioContext);
  }, [status, conversation]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="text-chat">
      <h2>Talk</h2>
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.length === 0 && !isWaitingForMicPermission && status !== 'connected' ? (
          <p>Starting a talk session with Kiaan...</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.role === 'user' ? 'user' : 'server'}`}
            >
              <p>{msg.content}</p>
            </div>
          ))
        )}
        {isWaitingForMicPermission && <p>Waiting for microphone permission...</p>}
        {status === 'connected' && isSpeaking && <p>Kiaan is speaking...</p>}
        {status === 'connected' && !isSpeaking && !isWaitingForMicPermission && !useTextFallback && <p>Listening...</p>}
      </div>
      <div>
        {status !== 'connected' ? (
          <button className="voice-button" onClick={() => handleStart(0, 3)} disabled={isWaitingForMicPermission}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        ) : (
          <button className="voice-button" onClick={handleStop}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {(useTextFallback || status !== 'connected') && (
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your message here..."
            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
          />
          <button className="icon-button" onClick={handleTextSubmit}>
            <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      )}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default Talk;
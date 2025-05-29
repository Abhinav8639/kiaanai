import React, { useState, useEffect, useRef } from 'react';

const VoiceChat = () => {
  const [messages, setMessages] = useState([]);
  const [isWaitingForMicPermission, setIsWaitingForMicPermission] = useState(false);
  const [error, setError] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false); // New state for recording
  const [textInput, setTextInput] = useState('');
  const [useTextFallback, setUseTextFallback] = useState(false);
  const chatHistoryRef = useRef(null);
  const micStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);

  // Replace with your ElevenLabs API key
  const ELEVENLABS_API_KEY = 'sk_e036e2d0a3cbae44b85dd27a1aa895be89ed2fd55a8e0418';
  // Voice ID for TTS (Rachel)
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

  const checkMicPermission = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      console.log('Initial microphone permission status:', permissionStatus.state);
      if (permissionStatus.state === 'granted') {
        setHasMicPermission(true);
      } else if (permissionStatus.state === 'denied') {
        setError('Microphone permission denied. Please enable it in your browser settings to use voice chat, or type your message below.');
        setUseTextFallback(true);
      }
      permissionStatus.onchange = () => {
        console.log('Microphone permission changed:', permissionStatus.state);
        if (permissionStatus.state === 'granted') {
          setHasMicPermission(true);
          setError('');
          setUseTextFallback(false);
        } else if (permissionStatus.state === 'denied') {
          setHasMicPermission(false);
          setError('Microphone permission denied. Please enable it in your browser settings to use voice chat, or type your message below.');
          setUseTextFallback(true);
        }
      };
    } catch (err) {
      console.error('Error checking microphone permission:', err);
      setError('Error checking microphone permission. Please ensure your browser supports this feature.');
      setUseTextFallback(true);
    }
  };

  const requestMicAccess = async () => {
    try {
      console.log('Requesting microphone access...');
      setIsWaitingForMicPermission(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted. Active tracks:', stream.getAudioTracks());
      micStreamRef.current = stream;
      setHasMicPermission(true);
      setIsWaitingForMicPermission(false);
      setError('');
      setUseTextFallback(false);
      return stream;
    } catch (err) {
      console.error('Error requesting microphone access:', err);
      setError('Failed to access microphone: ' + err.message + '. Please enable microphone access in your browser settings, or type your message below.');
      setIsWaitingForMicPermission(false);
      setUseTextFallback(true);
      return null;
    }
  };

  const setupMediaRecorder = (stream) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/wav') ? 'audio/wav' :
                    MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                    MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : null;
    if (!mimeType) {
      setError('No supported audio MIME type found for recording.');
      setUseTextFallback(true);
      return;
    }
    console.log('Using MIME type for recording:', mimeType);

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      console.log('MediaRecorder data available, size:', event.data.size);
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      } else {
        console.warn('No audio data captured in this chunk');
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('MediaRecorder stopped, total chunks:', audioChunksRef.current.length);
      setIsRecording(false); // Update recording state
      if (audioChunksRef.current.length === 0) {
        setError('No audio data captured. Please speak louder or check your microphone.');
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      console.log('Audio blob size:', audioBlob.size);

      // Debug: Play the recorded audio locally to verify capture
      const audioUrl = URL.createObjectURL(audioBlob);
      const testAudio = new Audio(audioUrl);
      testAudio.onended = () => URL.revokeObjectURL(audioUrl);
      console.log('Playing recorded audio for debugging...');
      testAudio.play().catch(err => {
        console.error('Error playing recorded audio:', err);
        setError('Error playing recorded audio: ' + err.message);
      });

      audioChunksRef.current = [];
      await transcribeAudio(audioBlob);
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
      setError('Error recording audio: ' + event.error.message);
      setUseTextFallback(true);
      setIsRecording(false);
    };
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      console.log('Transcribing audio with ElevenLabs STT...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to transcribe audio: ${response.statusText} (${response.status}) - ${errorText}`);
      }

      const result = await response.json();
      console.log('STT API response:', result);
      const transcript = result.text;
      console.log('Transcribed text:', transcript);

      if (transcript) {
        setMessages(prev => [...prev, { role: 'user', content: transcript }]);
        handleAssistantResponse(transcript);
      } else {
        setError('No speech detected in the audio. Please try speaking again.');
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
      setError('Failed to transcribe audio: ' + err.message + '. You can type your message below.');
      setUseTextFallback(true);
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && hasMicPermission && !useTextFallback) {
      console.log('Starting audio recording...');
      audioChunksRef.current = [];
      setIsRecording(true);
      mediaRecorderRef.current.start();

      // Set a timeout to stop recording after 10 seconds if not stopped manually
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Stopping recording after timeout...');
          mediaRecorderRef.current.stop();
        }
      }, 10000); // 10 seconds
    } else {
      console.warn('Cannot start recording. hasMicPermission:', hasMicPermission, 'useTextFallback:', useTextFallback);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Manually stopping recording...');
      mediaRecorderRef.current.stop();
      clearTimeout(recordingTimeoutRef.current);
    }
  };

  const speakText = async (text) => {
    try {
      console.log('Generating speech with ElevenLabs TTS...');
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate speech: ${response.statusText} (${response.status}) - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onplay = () => {
        console.log('Assistant started speaking:', text);
        setIsSpeaking(true);
      };

      audio.onended = () => {
        console.log('Assistant finished speaking');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        if (isSessionActive && hasMicPermission && !useTextFallback) {
          startRecording();
        }
      };

      audio.onerror = (event) => {
        console.error('Audio playback error:', event);
        setError('Failed to play audio: ' + event.message);
        setIsSpeaking(false);
      };

      audio.play();
    } catch (err) {
      console.error('Error generating speech:', err);
      setError('Failed to generate speech: ' + err.message);
      setIsSpeaking(false);
    }
  };

  const handleAssistantResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
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
    speakText(response);
  };

  const handleStart = async () => {
    if (isSessionActive || isWaitingForMicPermission) {
      console.log('Session already active or waiting for permission. Aborting start.');
      return;
    }

    try {
      const stream = await requestMicAccess();
      if (!stream) {
        console.log('Proceeding with text fallback due to lack of microphone access');
      } else {
        setupMediaRecorder(stream);
      }

      console.log('Starting voice chat session...');
      setIsSessionActive(true);
      const initialGreeting = "Hey there, I'm Alex from kiaan support. How can I help you today?";
      setMessages([{ role: 'assistant', content: initialGreeting }]);
      speakText(initialGreeting);
    } catch (error) {
      console.error('Error starting voice chat:', error);
      setError(`Failed to start voice chat: ${error.message}. You can type your message below to continue.`);
      setIsWaitingForMicPermission(false);
      setIsSessionActive(false);
      setUseTextFallback(true);
    }
  };

  const handleStop = async () => {
    try {
      console.log('Stopping session...');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      clearTimeout(recordingTimeoutRef.current);
      setMessages([]);
      setError('');
      setIsSessionActive(false);
      setIsSpeaking(false);
      setIsRecording(false);
      setUseTextFallback(false);
      setTextInput('');
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    } catch (error) {
      console.error('Error ending voice chat:', error);
      setError(`Failed to end voice chat: ${error.message}`);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: textInput }]);
      handleAssistantResponse(textInput);
      setTextInput('');
    }
  };

  useEffect(() => {
    checkMicPermission();

    return () => {
      if (isSessionActive && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      clearTimeout(recordingTimeoutRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="text-chat">
      <h2>Voice Chat</h2>
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.length === 0 && !isWaitingForMicPermission && !isSessionActive ? (
          <p>Click the button to start speaking with Kiaan</p>
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
        {isSessionActive && isSpeaking && <p>Kiaan is speaking...</p>}
        {isSessionActive && !isSpeaking && !isWaitingForMicPermission && !useTextFallback && (
          isRecording ? <p>Recording... (Click to stop)</p> : <p>Listening...</p>
        )}
      </div>
      <div>
        {!isSessionActive ? (
          <button className="voice-button" onClick={handleStart} disabled={isWaitingForMicPermission}>
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
        {isSessionActive && !hasMicPermission && (
          <button
            className="voice-button"
            onClick={requestMicAccess}
            style={{ marginLeft: '10px', background: 'blue' }}
          >
            Retry Microphone Access
          </button>
        )}
        {isSessionActive && isRecording && (
          <button
            className="voice-button"
            onClick={stopRecording}
            style={{ marginLeft: '10px', background: 'red' }}
          >
            Stop Recording
          </button>
        )}
      </div>
      {isSessionActive && useTextFallback && (
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

export default VoiceChat;
  import React, { useState, useRef } from 'react';

  const TextChat = ({ webhookUrl }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileClick = () => {
      fileInputRef.current.click();
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');

      if (!webhookUrl) {
        setError('Webhook URL is missing. Please ensure the backend is configured.');
        return;
      }

      const formData = new FormData();
      formData.append('message', message);
      if (file) {
        formData.append('file', file);
      }

      try {
        setMessages(prev => [...prev, { role: 'user', content: message }]);

        const res = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setMessages(prev => [...prev, { role: 'server', content: data.response || 'No response from server' }]);
        }

        setMessage('');
        setFile(null);
        fileInputRef.current.value = ''; // Reset file input
      } catch (err) {
        console.error('Error sending message:', err);
        setError(`Failed to send message: ${err.message}`);
      }
    };

    return (
      <div className="text-chat">
        <h2>Text Chat</h2>
        <div className="chat-history">
          {messages.length === 0 ? (
            <p>Hello! What can I help you with?</p>
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
        </div>
        <div className="chat-input-container">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="chat-input"
          />
          <div className="chat-actions">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button className="icon-button" onClick={handleFileClick}>
              <svg className="paperclip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.586-6.586a4 4 0 00-5.656-5.656L5.757 10.757a6 6 0 008.486 8.486L21 12" />
              </svg>
            </button>
            <button className="icon-button" onClick={handleSubmit}>
              <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  };

  export default TextChat;
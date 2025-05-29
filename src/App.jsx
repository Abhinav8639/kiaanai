import React, { useState, useEffect } from 'react';
import Orb from './Orb.jsx';
import Panel from './Panel.jsx';
import './KiaanStyles.css';

const App = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('http://147.93.108.56/task/webhook.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded', // Match PHP's expected format
          },
          body: new URLSearchParams({
            message: 'hello', // Send 'message' field as expected by webhook.php
          }).toString(),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const data = await res.json();
        console.log('Webhook response:', data); // Debug the response

        // Temporarily bypass strict validation to test the response
        // Replace with actual validation once webhook.php is updated
        setConfig({

          chatAgentId: 'agent_01jwc42yt6e6rvb7hqgqyt6gj2', // Fallback until backend provides these
          meetingAgentId: 'agent_01jwc42yt6e6rvb7hqgqyt6gj2',
          webhookUrl: 'http://147.93.108.56/task/webhook.php',
          response: data.response || 'No response from webhook',
        });
      } catch (err) {
        console.error('Error fetching config:', err);
        setError(`Failed to load configuration: ${err.message}`);
      }
    };
    fetchConfig();
  }, []);

  const togglePanel = () => {
    setIsPanelOpen(prev => !prev);
  };

  if (error) {
    return <div style={{ color: '#ef4444', minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{error}</div>;
  }

  if (!config) {
    return <div style={{ color: '#1f2a44', minHeight: '100vh', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading configuration...</div>;
  }

  return (
    <div className="landing-page">
      <h1>Meet Kiaan</h1>
      <p>Your futuristic voice-only AI assistant</p>
      <p className="instruction">Click the voice orb in the bottom-right corner to start speaking with Kiaan.</p>
      <p className="powered-by">Powered by Solutions Bajaj</p>

      <Orb isPanelOpen={isPanelOpen} togglePanel={togglePanel} />
      {isPanelOpen && <Panel config={config} togglePanel={togglePanel} />}
    </div>
  );
};

export default App;
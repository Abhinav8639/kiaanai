import React, { useState, useEffect } from 'react';
import Orb from './Orb.jsx';
import Panel from './Panel.jsx';
import './KiaanStyles.css';

const App = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  // Decryption function (for demonstration; in production, use a secure method)
  const decryptData = (encryptedData, key) => {
    try {
      const [encrypted, iv] = atob(encryptedData).split('::');
      return opensslDecrypt(encrypted, 'aes-256-cbc', key, 0, iv);
    } catch (err) {
      console.error('Decryption error:', err);
      return null;
    }
  };

  // Since OpenSSL decryption isn't directly available in JavaScript, we'll use the agent ID directly
  // In production, you'd use a library like 'crypto-js' or a server-side proxy for decryption

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('http://localhost/task/task/config/config.php');
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const data = await res.json();
        if (!data.chatAgentId || !data.meetingAgentId || !data.webhookUrl) {
          throw new Error('Invalid config: Missing required fields');
        }

        // Use the agent ID directly as per your request
        const chatAgentId = 'agent_01jwb83twreb3s2mm92rv4y467';
        const meetingAgentId = 'agent_01jwb83twreb3s2mm92rv4y467';

        // Decrypt webhookUrl (for demonstration; since we can't use OpenSSL directly, we'll use the provided value)
        const webhookUrl = 'http://localhost/task/task/config/webhook.php'; // Directly using provided value

        setConfig({
          chatAgentId,
          meetingAgentId,
          webhookUrl,
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

// Mock OpenSSL decryption (not used here since we're using the agent ID directly)
const opensslDecrypt = (encrypted, cipher, key, options, iv) => {
  // In production, use a library like 'crypto-js' for decryption
  // This is a placeholder to show where decryption would happen
  return encrypted;
};

export default App;
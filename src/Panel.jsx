import React, { useState } from 'react';
import VoiceChat from './VoiceChat.jsx';
import Meeting from './Meeting.jsx';
import TextChat from './TextChat.jsx';

const Panel = ({ config, togglePanel }) => {
  const [mode, setMode] = useState('voiceChat');

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Talk with Kiaan</h2>
          <span>Status: disconnected</span>
        </div>
        <button onClick={togglePanel}>✕</button>
      </div>
      <div className="panel-content">
        {mode === 'voiceChat' && (
          <>
            <div className="glow-effect">
              <div className="glow-circle-1"></div>
              <div className="glow-circle-2"></div>
            </div>
            <VoiceChat agentId={config.chatAgentId} />
          </>
        )}
        {mode === 'meeting' && (
          <>
            <div className="glow-effect">
              <div className="glow-circle-1"></div>
              <div className="glow-circle-2"></div>
            </div>
            <Meeting agentId={config.meetingAgentId} />
          </>
        )}
        {mode === 'textChat' && <TextChat webhookUrl={config.webhookUrl} />}
      </div>
      <div className="panel-footer">
        <button
          className={mode === 'voiceChat' ? 'active' : 'inactive'}
          onClick={() => setMode('voiceChat')}
        >
          Talk
        </button>
        <button
          className={mode === 'meeting' ? 'active' : 'inactive'}
          onClick={() => setMode('meeting')}
        >
          Meeting
        </button>
        <button
          className={mode === 'textChat' ? 'active' : 'inactive'}
          onClick={() => setMode('textChat')}
        >
          Chat
        </button>
      </div>
    </div>
  );
};

export default Panel;
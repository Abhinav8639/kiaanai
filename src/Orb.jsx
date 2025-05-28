import React, { useState, useEffect } from 'react';

const Orb = ({ isPanelOpen, togglePanel }) => {
  const [position, setPosition] = useState({
    x: window.innerWidth - 60,
    y: window.innerHeight - 60,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleStart = (e) => {
    e.preventDefault();
    console.log('Drag started at:', e.type, { clientX: e.clientX, clientY: e.clientY });
    setIsDragging(true);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setStartPos({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    console.log('Dragging:', e.type);
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    const newX = Math.min(Math.max(clientX - startPos.x, 0), window.innerWidth - 60);
    const newY = Math.min(Math.max(clientY - startPos.y, 0), window.innerHeight - 60);
    setPosition({ x: newX, y: newY });
  };

  const handleEnd = (e) => {
    console.log('Drag ended:', e.type);
    setIsDragging(false);
    const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;
    const deltaX = Math.abs(clientX - startPos.x - position.x);
    const deltaY = Math.abs(clientY - startPos.y - position.y);
    console.log('Movement delta:', { deltaX, deltaY });
    if (deltaX < 5 && deltaY < 5) {
      console.log('Detected as click, calling togglePanel');
      togglePanel();
    } else {
      console.log('Detected as drag, not calling togglePanel');
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, startPos, togglePanel]);

  return (
    <div
      className={`orb ${isPanelOpen ? 'orb-hidden' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px`, pointerEvents: 'auto' }}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >
      K
    </div>
  );
};

export default Orb;
import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { EditorPanel } from '../components/EditorPanel';
import { ResultPanel } from '../components/ResultPanel';

export const EditorPage = () => {
  const [editorWidth, setEditorWidth] = useState(60); // percentage
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (_e: React.MouseEvent) => {
    isDragging.current = true;
    setIsDraggingState(true);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    if (newWidth > 20 && newWidth < 80) {
      setEditorWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setIsDraggingState(false);
    document.body.style.cursor = 'default';
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-row h-screen bg-bg-main overflow-hidden text-text-main transition-colors duration-200 relative">
      <Sidebar />
      <div ref={containerRef} className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div 
          className="flex flex-col min-w-0"
          style={{ 
            width: window.innerWidth >= 768 ? `${editorWidth}%` : '100%',
            height: window.innerWidth < 768 ? `${editorWidth}%` : '100%'
          }} 
        >
          <EditorPanel />
        </div>
        
        {/* Splitter (Vertical on Desktop, Horizontal on Mobile) */}
        <div 
          className="bg-border-main hover:bg-primary z-10 transition-colors hidden md:block w-1 cursor-col-resize"
          onMouseDown={handleMouseDown}
        />
        <div 
          className="bg-border-main hover:bg-primary z-10 transition-colors md:hidden h-2 cursor-row-resize flex items-center justify-center"
          onTouchStart={(_e) => {
            isDragging.current = true;
            setIsDraggingState(true);
          }}
          onMouseDown={(_e) => {
            isDragging.current = true;
            setIsDraggingState(true);
            document.body.style.cursor = 'row-resize';
          }}
        >
          <div className="w-10 h-1 bg-text-muted rounded-full opacity-50"></div>
        </div>
        
        <div 
          className="flex flex-col min-w-0"
          style={{ 
            width: window.innerWidth >= 768 ? `${100 - editorWidth}%` : '100%',
            height: window.innerWidth < 768 ? `${100 - editorWidth}%` : '100%'
          }} 
        >
          <ResultPanel />
        </div>
      </div>

      {/* Invisible overlay to prevent iframe from stealing mouse events during drag */}
      {isDraggingState && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  );
};

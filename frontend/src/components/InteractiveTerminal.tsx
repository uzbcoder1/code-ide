import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useAuthStore } from '../store/useAuthStore';

interface InteractiveTerminalProps {
  language: string;
  content: string;
  onFinished?: () => void;
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({ language, content, onFinished }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = terminal;

    terminal.writeln(`\x1b[33m$ Running ${language} code...\x1b[0m\r\n`);

    // Determine WebSocket URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/execute/ws';

    // Establish WebSocket connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send initial payload to start execution
      ws.send(JSON.stringify({
        language,
        content,
        token
      }));
    };

    ws.onmessage = (event) => {
      // Write server output to terminal
      terminal.write(event.data);
    };

    ws.onclose = () => {
      terminal.writeln('\r\n\x1b[33m[Connection closed]\x1b[0m');
      if (onFinished) onFinished();
    };

    ws.onerror = (error) => {
      terminal.writeln('\r\n\x1b[31m[WebSocket Error]\x1b[0m');
      console.error('WebSocket Error:', error);
    };

    // Listen to user typing and send to WebSocket
    const disposable = terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Handle resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      disposable.dispose();
      ws.close();
      terminal.dispose();
    };
  }, [language, content, token, onFinished]);

  return (
    <div 
      ref={terminalRef} 
      className="w-full h-full min-h-[300px] bg-[#1e1e1e] p-2 rounded"
      style={{ overflow: 'hidden' }}
    />
  );
};

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Play, Terminal, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../api';

export const RunScreen: React.FC = () => {
  const { projects, activeProjectId, setTerminalOutput, terminalOutput } = useStore();
  const [isRunning, setIsRunning] = useState(false);
  
  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleRun = async () => {
    if (!activeProject) return;
    
    // HTML is handled by the Result panel
    if (['html', 'css', 'json'].includes(activeProject.language)) {
      setTerminalOutput(`${activeProject.language.toUpperCase()} projects run directly in the Result tab. Switch to Result to see your preview.`);
      return;
    }

    setTerminalOutput(`$ Running ${activeProject.title}...\n\nWaiting for execution...`);
    setIsRunning(true);
    
    try {
      const response = await api.post('/execute', {
        language: activeProject.language,
        content: activeProject.content
      });
      
      const { output, error, exit_code } = response.data;
      let finalOutput = `$ Running ${activeProject.title}...\n\n`;
      if (output) finalOutput += `${output}\n`;
      if (error) finalOutput += `[Error]\n${error}\n`;
      finalOutput += `\nProcess finished with exit code ${exit_code}`;
      
      setTerminalOutput(finalOutput);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Unknown error';
      setTerminalOutput(`$ Running ${activeProject.title}...\n\n[System Error]\n${message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle size={48} className="text-text-muted mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
        <p className="text-text-muted text-sm">Go to the Projects tab and select or create a project to run.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-main relative">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 bg-bg-surface border-b border-border-main shrink-0">
        <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
          <Terminal size={20} className="text-primary" />
          Execution
        </h2>
        <div className="flex items-center gap-2 bg-border-main px-3 py-1 rounded text-sm text-text-main">
          <span className={activeProject.language === 'html' ? 'text-orange-500' : 'text-primary'}>●</span> 
          <span className="uppercase text-xs font-bold">{activeProject.language}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            {isRunning ? (
              <RefreshCw size={40} className="text-primary animate-spin" />
            ) : (
              <Play size={40} className="text-primary ml-2" />
            )}
          </div>
          
          <h3 className="text-xl font-bold mb-2">Ready to run</h3>
          <p className="text-text-muted text-sm text-center max-w-xs mb-8">
            Click the button below to run your {activeProject.title} code on the server.
          </p>
          
          <button 
            onClick={handleRun}
            disabled={isRunning}
            className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-transform ${
              isRunning 
                ? 'bg-primary/50 text-white/70 cursor-not-allowed' 
                : 'bg-primary text-white active:scale-95'
            }`}
          >
            {isRunning ? (
              <>Running...</>
            ) : (
              <><Play size={24} fill="currentColor" /> Run Code</>
            )}
          </button>
        </div>

        {/* Terminal Output Area */}
        <div className="mt-4 shrink-0 max-h-64 h-full bg-bg-surface rounded-xl border border-border-main overflow-hidden flex flex-col shadow-inner">
          <div className="bg-border-main px-4 py-2 flex items-center gap-2 text-xs font-semibold text-text-muted">
            <Terminal size={14} />
            Console Output
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-text-main whitespace-pre-wrap">
            {terminalOutput || <span className="text-text-muted italic">No output yet. Run your code to see results here.</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

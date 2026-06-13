import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Play, Terminal, AlertCircle, RefreshCw } from 'lucide-react';
import { InteractiveTerminal } from '../InteractiveTerminal';

export const RunScreen: React.FC = () => {
  const { projects, activeProjectId, runTrigger, triggerRun } = useStore();
  const [isRunning, setIsRunning] = useState(false);
  
  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleRun = () => {
    if (!activeProject) return;
    triggerRun();
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
            <Play size={40} className="text-primary ml-2" />
          </div>
          
          <h3 className="text-xl font-bold mb-2">Ready to run</h3>
          <p className="text-text-muted text-sm text-center max-w-xs mb-8">
            Click the button below to run your {activeProject.title} code on the server.
          </p>
          
          <button 
            onClick={handleRun}
            className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-transform bg-primary text-white active:scale-95`}
          >
            <Play size={16} fill="currentColor" />
            <span>Run</span>
          </button>
        </div>

        {/* Terminal Output Area */}
        <div className="mt-4 shrink-0 max-h-64 h-full bg-bg-surface rounded-xl border border-border-main overflow-hidden flex flex-col shadow-inner">
          <div className="bg-border-main px-4 py-2 flex items-center gap-2 text-xs font-semibold text-text-muted">
            <Terminal size={14} />
            Console Output
          </div>
          <div className="flex-1 flex flex-col min-h-0 bg-[#0d0d0d]">
            <div className="flex-1 p-2 bg-[#1e1e1e]">
              {runTrigger > 0 ? (
                <InteractiveTerminal 
                  key={runTrigger} 
                  language={activeProject.language}
                  content={activeProject.content}
                />
              ) : (
                <div className="text-gray-400 font-mono text-sm p-4">
                  &gt; Ready. Press "Run" to start the interactive terminal...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

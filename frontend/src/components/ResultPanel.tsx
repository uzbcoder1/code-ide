import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { RefreshCw, ExternalLink, Monitor, Tablet, Smartphone } from 'lucide-react';

export const ResultPanel = ({ isMobile = false }: { isMobile?: boolean }) => {
  const { projects, activeProjectId, terminalOutput, terminalInput, setTerminalInput } = useStore();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const [srcDoc, setSrcDoc] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    if (activeProject && activeProject.language === 'html') {
      const timeout = setTimeout(() => {
        setSrcDoc(activeProject.content);
      }, 500); // debounce rendering
      return () => clearTimeout(timeout);
    } else {
      setSrcDoc('');
    }
  }, [activeProject?.content, activeProject?.language]);

  if (!activeProject || activeProject.language !== 'html') {
    return (
      <div className="h-full w-full bg-bg-main flex flex-col">
        <div className="h-14 flex items-center px-4 bg-bg-surface border-b border-border-main">
          <h2 className="font-semibold text-text-main flex items-center gap-2">
            <Monitor size={16} /> Terminal
          </h2>
        </div>
        <div className="flex-1 flex flex-col bg-[#0d0d0d] overflow-hidden">
          <div className="p-4 border-b border-[#222]">
            <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
              <span>Standard Input (stdin)</span>
              {terminalInput && (
                <button 
                  onClick={() => setTerminalInput('')}
                  className="text-gray-500 hover:text-gray-300 text-[10px]"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              className="w-full h-20 bg-[#1a1a1a] border border-[#333] rounded p-2 text-green-400 font-mono text-sm focus:outline-none focus:border-green-500 resize-y"
              placeholder="Enter input data here before running..."
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
            />
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-xs text-gray-400 mb-2">Standard Output (stdout)</div>
            <div className="w-full font-mono text-sm text-green-400 whitespace-pre-wrap">
              {terminalOutput || '> Ready. Type input above (if needed) and press "Run" to execute...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getWidthClass = () => {
    switch (previewMode) {
      case 'mobile': return 'w-[375px]';
      case 'tablet': return 'w-[768px]';
      default: return 'w-full';
    }
  };

  return (
    <div className="h-full w-full bg-bg-main flex flex-col">
      <div className="h-14 flex items-center justify-between px-4 bg-bg-surface border-b border-border-main">
        <h2 className="font-semibold text-text-main flex items-center gap-2">
          <Monitor size={16} /> Result
        </h2>
        <div className="flex items-center gap-3">
          {!isMobile && (
            <div className="flex items-center gap-1 bg-bg-hover p-1 rounded border border-border-main">
              <button onClick={() => setPreviewMode('desktop')} className={`p-1 rounded ${previewMode === 'desktop' ? 'bg-border-main text-text-main' : 'text-text-muted hover:text-text-main'}`}>
                <Monitor size={14} />
              </button>
              <button onClick={() => setPreviewMode('tablet')} className={`p-1 rounded ${previewMode === 'tablet' ? 'bg-border-main text-text-main' : 'text-text-muted hover:text-text-main'}`}>
                <Tablet size={14} />
              </button>
              <button onClick={() => setPreviewMode('mobile')} className={`p-1 rounded ${previewMode === 'mobile' ? 'bg-border-main text-text-main' : 'text-text-muted hover:text-text-main'}`}>
                <Smartphone size={14} />
              </button>
            </div>
          )}
          <button className="text-text-muted hover:text-text-main transition-colors" onClick={() => setSrcDoc(activeProject.content)}>
            <RefreshCw size={16} />
          </button>
          <button 
            className="text-text-muted hover:text-text-main transition-colors"
            onClick={() => {
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(activeProject.content);
                newWindow.document.close();
              }
            }}
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 bg-gray-200 dark:bg-black overflow-hidden flex justify-center items-start">
        <div className={`${getWidthClass()} h-full transition-all duration-300 ease-in-out bg-white rounded shadow-lg overflow-hidden`}>
          <iframe 
            srcDoc={srcDoc}
            title="output"
            sandbox="allow-scripts allow-modals"
            referrerPolicy="no-referrer"
            width="100%"
            height="100%"
            className="border-none"
          />
        </div>
      </div>
    </div>
  );
};

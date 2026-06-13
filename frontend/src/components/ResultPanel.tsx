import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { RefreshCw, ExternalLink, Monitor, Tablet, Smartphone } from 'lucide-react';
import { InteractiveTerminal } from './InteractiveTerminal';

export const ResultPanel = ({ isMobile = false }: { isMobile?: boolean }) => {
  const { projects, activeProjectId, runTrigger } = useStore();
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
        <div className="flex-1 p-2 bg-[#1e1e1e]">
          {runTrigger > 0 && activeProject ? (
            <InteractiveTerminal 
              key={runTrigger} // Re-mount terminal on each run
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

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { FileCode, Plus, Trash2, Search, Menu } from 'lucide-react';

const getLanguageFromExtension = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': case 'htm': case 'css': return 'html';
    case 'js': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'cpp': case 'cc': case 'c': return 'cpp';
    case 'cs': return 'csharp';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'rb': return 'ruby';
    case 'php': return 'php';
    case 'swift': return 'swift';
    case 'sql': return 'sql';
    case 'sh': case 'bash': return 'shell';
    case 'json': return 'json';
    default: return 'plaintext';
  }
};

export const Sidebar = () => {
  const { projects, activeProjectId, setActiveProject, deleteProject, addProject, isSidebarOpen, toggleSidebar } = useStore();
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingFile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingFile]);

  const handleCreateSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newFileName.trim()) {
      setIsCreatingFile(false);
      return;
    }
    
    const filename = newFileName.trim();
    const language = getLanguageFromExtension(filename);
    
    addProject({
      id: Date.now().toString(),
      title: filename,
      language,
      content: '',
      lastModified: new Date().toISOString()
    });
    
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateSubmit();
    if (e.key === 'Escape') {
      setIsCreatingFile(false);
      setNewFileName('');
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={toggleSidebar}
        />
      )}
      <div className={`bg-bg-surface h-full flex flex-col border-r border-border-main text-sm shrink-0 transition-all duration-300 absolute md:relative z-40 ${
        isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-14'
      }`}>
        <div className="p-4 flex items-center justify-between border-b border-border-main">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 font-bold text-lg text-text-main whitespace-nowrap overflow-hidden">
              <FileCode className="text-primary" />
              CodeStudio
            </div>
          )}
          <button onClick={toggleSidebar} className="text-text-muted hover:text-text-main transition-colors mx-auto">
            <Menu size={20} />
          </button>
        </div>

      <div className="p-2 flex-1 overflow-hidden flex flex-col">
        {isSidebarOpen && (
          <>
            <div className="flex items-center justify-between mb-4 px-2 mt-2">
              <h2 className="text-text-muted font-semibold text-xs uppercase tracking-wider">My Projects</h2>
              <button 
                onClick={() => setIsCreatingFile(true)}
                className="flex items-center gap-1 text-text-muted hover:text-text-main transition-colors"
                title="New File"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="relative mb-4 px-2">
              <Search className="absolute left-4 top-2 text-text-muted" size={14} />
              <input 
                type="text" 
                placeholder="Search files..." 
                className="w-full bg-bg-hover text-text-main rounded pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1 overflow-y-auto flex-1 pb-4">
          {isCreatingFile && isSidebarOpen && (
            <div className="flex items-center gap-2 p-2 mx-2 rounded bg-border-main text-text-main">
              <FileCode size={16} className="text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => handleCreateSubmit()}
                placeholder="filename.ext"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          )}

          {projects.map((project) => (
            <div 
              key={project.id}
              onClick={() => setActiveProject(project.id)}
              className={`flex items-center p-2 rounded cursor-pointer group transition-colors ${
                isSidebarOpen ? 'justify-between mx-2' : 'justify-center mx-1'
              } ${
                activeProjectId === project.id ? 'bg-border-main text-text-main' : 'text-text-muted hover:bg-bg-hover'
              }`}
              title={!isSidebarOpen ? project.title : undefined}
            >
              <div className="flex items-center gap-2 truncate">
                <FileCode size={16} className={`shrink-0 ${
                  project.language === 'html' ? 'text-orange-500' :
                  project.language === 'javascript' || project.language === 'typescript' ? 'text-yellow-500' :
                  project.language === 'python' ? 'text-blue-400' :
                  project.language === 'java' || project.language === 'cpp' || project.language === 'csharp' ? 'text-purple-500' :
                  'text-blue-500'
                }`} />
                {isSidebarOpen && <span className="truncate">{project.title}</span>}
              </div>
              {isSidebarOpen && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </>
  );
};

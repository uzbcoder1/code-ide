import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { Save, Play, Settings, X, CheckCircle, Sun, Moon, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { emmetHTML } from 'emmet-monaco-es';

export const EditorPanel = ({ isMobile = false }: { isMobile?: boolean }) => {
  const { projects, activeProjectId, updateProjectContent, setTerminalOutput, theme, toggleTheme } = useStore();
  const { user, logout } = useAuthStore();
  const [toastMessage, setToastMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  const emmetRegistered = useRef(false);
  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleEditorDidMount = (_editor: any, monaco: any) => {
    if (!emmetRegistered.current) {
      emmetHTML(monaco);
      emmetRegistered.current = true;
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeProject && value !== undefined) {
      updateProjectContent(activeProject.id, value);
    }
  };

  const handleSave = () => {
    if (!activeProject) return;
    setToastMessage(`Saved ${activeProject.title} successfully!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleRun = async () => {
    if (!activeProject) return;
    if (activeProject.language === 'html') {
      setToastMessage('Live preview updated automatically in Result panel.');
      setTimeout(() => setToastMessage(''), 3000);
    } else {
      setTerminalOutput(`$ Running ${activeProject.title}...\n\nWaiting for execution...`);
      setIsRunning(true);
      try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/execute`, {
          language: activeProject.language,
          content: activeProject.content
        });
        
        const { output, error, exit_code } = response.data;
        let finalOutput = `$ Running ${activeProject.title}...\n\n`;
        if (output) finalOutput += `${output}\n`;
        if (error) finalOutput += `[Error]\n${error}\n`;
        finalOutput += `\nProcess finished with exit code ${exit_code}`;
        
        setTerminalOutput(finalOutput);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setTerminalOutput(`$ Running ${activeProject.title}...\n\n[System Error]\nFailed to connect to execution engine. Make sure the backend server is running.\n${message}`);
      } finally {
        setIsRunning(false);
      }
    }
    setTimeout(() => setToastMessage(''), 4000);
  };

  if (!activeProject) {
    return <div className="flex-1 flex items-center justify-center bg-bg-hover text-text-muted">Select a project to start coding</div>;
  }

  return (
    <div className="flex-1 h-full flex flex-col min-w-0 bg-bg-hover relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-bg-surface border border-primary text-text-main px-4 py-2 rounded shadow-lg flex items-center gap-2">
          <CheckCircle size={16} className="text-primary" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className="h-14 flex items-center justify-between px-4 bg-bg-surface border-b border-border-main">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-border-main px-3 py-1.5 rounded-t-lg mt-2 border-b-2 border-primary text-sm text-text-main">
            <span className={activeProject.language === 'html' ? 'text-orange-500' : 'text-primary'}>●</span> {activeProject.title}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-muted hover:text-text-main transition-colors">
            <Save size={16} /> Save
          </button>
          {!isMobile && (
            <>
              <button onClick={handleRun} disabled={isRunning} className={`flex items-center gap-1 px-4 py-1.5 text-white rounded text-sm transition-colors font-semibold shadow-sm ${isRunning ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover'}`}>
                <Play size={16} fill="currentColor" /> {isRunning ? 'Running...' : 'Run'}
              </button>
              <div className="w-px h-6 bg-border-main mx-1"></div>
              <button onClick={toggleTheme} className="text-text-muted hover:text-text-main transition-colors" title="Toggle Theme">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary mr-2">{user.username}</span>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30">
                      Admin Panel
                    </Link>
                  )}
                  <button onClick={logout} className="text-xs text-text-muted hover:text-red-500 transition-colors">
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/login" className="text-text-muted hover:text-text-main transition-colors flex items-center gap-1" title="Account">
                  <UserCircle size={18} />
                  <span className="text-xs">Login</span>
                </Link>
              )}
              <button onClick={() => setIsSettingsOpen(true)} className="text-text-muted hover:text-text-main transition-colors" title="Settings">
                <Settings size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 w-full pt-2">
        <Editor
          height="100%"
          language={activeProject.language}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={activeProject.content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineHeight: 24,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            formatOnPaste: true,
          }}
        />
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-bg-main border-t border-border-main flex items-center px-4 text-xs text-text-muted justify-between">
        <div className="flex gap-4">
          <span>Ln 1, Col 1</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span className="uppercase">{activeProject.language}</span>
        </div>
      </div>

      {/* Settings Modal Placeholder */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border-main rounded-lg w-80 p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-main">Editor Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-text-muted hover:text-text-main">
                <X size={20} />
              </button>
            </div>
            <div className="text-sm text-text-muted">
              <p className="mb-4">Settings functionality (like Font Size, Themes) will be available in Phase 2.</p>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-bg-hover text-text-main py-2 rounded hover:bg-border-main transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

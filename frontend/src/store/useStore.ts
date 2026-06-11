import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

export interface Project {
  id: string;
  title: string;
  language: string;
  content: string;
  lastModified: string;
}

interface EditorState {
  projects: Project[];
  activeProjectId: string | null;
  terminalOutput: string;
  terminalInput: string;
  isSidebarOpen: boolean;
  theme: 'dark' | 'light';
  setActiveProject: (id: string) => void;
  updateProjectContent: (id: string, content: string) => void;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  setTerminalOutput: (output: string) => void;
  setTerminalInput: (input: string) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

// Custom storage engine using idb-keyval for IndexedDB
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

const initialWelcomeProject: Project = {
  id: '1',
  title: 'welcome.py',
  language: 'python',
  content: '# Welcome to CodeStudio!\n# Your code is saved automatically to your device (IndexedDB).\n\nprint("Hello World!")',
  lastModified: new Date().toISOString()
};

export const useStore = create<EditorState>()(
  persist(
    (set) => ({
      projects: [initialWelcomeProject],
      activeProjectId: '1',
      terminalOutput: '',
      terminalInput: '',
      isSidebarOpen: true,
      theme: 'dark',
      
      setActiveProject: (id) => set({ activeProjectId: id }),
      
      updateProjectContent: (id, content) => set((state) => ({
        projects: state.projects.map((p) => 
          p.id === id ? { ...p, content, lastModified: new Date().toISOString() } : p
        )
      })),
      
      addProject: (project) => set((state) => ({
        projects: [...state.projects, project],
        activeProjectId: project.id
      })),
      
      deleteProject: (id) => set((state) => {
        const remaining = state.projects.filter(p => p.id !== id);
        return {
          projects: remaining,
          activeProjectId: state.activeProjectId === id 
            ? (remaining.length > 0 ? remaining[0].id : null) 
            : state.activeProjectId
        };
      }),
      
      setTerminalOutput: (output) => set({ terminalOutput: output }),
      setTerminalInput: (input) => set({ terminalInput: input }),
      
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        if (newTheme === 'light') {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
        return { theme: newTheme };
      })
    }),
    {
      name: 'codestudio-storage', // unique name for IndexedDB
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        isSidebarOpen: state.isSidebarOpen,
        theme: state.theme,
      }), // only persist these fields
    }
  )
);

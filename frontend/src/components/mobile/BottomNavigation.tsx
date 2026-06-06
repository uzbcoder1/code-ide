import React from 'react';
import { Folder, Code2, Play, Monitor, Settings } from 'lucide-react';

type Tab = 'projects' | 'editor' | 'run' | 'result' | 'settings';

interface BottomNavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'projects', label: 'Projects', icon: <Folder size={20} /> },
    { id: 'editor', label: 'Editor', icon: <Code2 size={20} /> },
    { id: 'run', label: 'Run', icon: <Play size={20} /> },
    { id: 'result', label: 'Result', icon: <Monitor size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-bg-surface border-t border-border-main flex items-center justify-around z-50 px-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-primary' : 'text-text-muted hover:text-text-main'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

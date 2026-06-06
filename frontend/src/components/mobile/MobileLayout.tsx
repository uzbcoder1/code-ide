import React, { useState } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { Sidebar } from '../Sidebar';
import { EditorPanel } from '../EditorPanel';
import { ResultPanel } from '../ResultPanel';
import { RunScreen } from './RunScreen';
import { SettingsScreen } from './SettingsScreen';

type Tab = 'projects' | 'editor' | 'run' | 'result' | 'settings';

export const MobileLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('projects');

  return (
    <div className="flex flex-col h-screen w-full bg-bg-main text-text-main overflow-hidden relative">
      {/* Tab Content Area */}
      <div className="flex-1 w-full overflow-y-auto pb-16">
        {/* We use display: none instead of conditional rendering for Editor so Monaco state isn't lost */}
        <div className={`w-full h-full ${activeTab === 'projects' ? 'block' : 'hidden'}`}>
          <Sidebar isMobile={true} />
        </div>
        
        <div className={`w-full h-full ${activeTab === 'editor' ? 'block' : 'hidden'}`}>
          <EditorPanel isMobile={true} />
        </div>
        
        <div className={`w-full h-full ${activeTab === 'run' ? 'block' : 'hidden'}`}>
          <RunScreen />
        </div>
        
        <div className={`w-full h-full ${activeTab === 'result' ? 'block' : 'hidden'}`}>
          <ResultPanel isMobile={true} />
        </div>
        
        <div className={`w-full h-full ${activeTab === 'settings' ? 'block' : 'hidden'}`}>
          <SettingsScreen />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

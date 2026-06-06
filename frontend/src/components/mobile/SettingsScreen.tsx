import React from 'react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Settings, UserCircle, LogOut, Moon, Sun, Type, SlidersHorizontal, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SettingsScreen: React.FC = () => {
  const { theme, toggleTheme } = useStore();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex flex-col h-full bg-bg-main overflow-y-auto">
      {/* Header */}
      <div className="h-14 flex items-center px-4 bg-bg-surface border-b border-border-main shrink-0 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
          <Settings size={20} className="text-primary" />
          Settings
        </h2>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Account Section */}
        <section>
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 px-2">Account</h3>
          <div className="bg-bg-surface rounded-xl border border-border-main overflow-hidden">
            {user ? (
              <>
                <div className="flex items-center gap-4 p-4 border-b border-border-main">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{user.first_name[0]}{user.last_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-main truncate">{user.first_name} {user.last_name}</h4>
                    <p className="text-sm text-text-muted truncate">@{user.username}</p>
                  </div>
                  {user.role === 'admin' && (
                    <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded">Admin</span>
                  )}
                </div>
                
                {user.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors border-b border-border-main">
                    <SlidersHorizontal size={20} className="text-text-muted" />
                    <span className="font-medium">Admin Dashboard</span>
                  </Link>
                )}
                
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors text-red-500"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <div className="p-4 flex flex-col items-center text-center">
                <UserCircle size={48} className="text-text-muted mb-3 opacity-50" />
                <h4 className="font-semibold mb-1">Not Logged In</h4>
                <p className="text-sm text-text-muted mb-4">Log in to save your projects to the cloud and access premium features.</p>
                <Link to="/login" className="bg-primary text-white font-semibold py-2 px-6 rounded-full w-full">
                  Login or Register
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 px-2">Preferences</h3>
          <div className="bg-bg-surface rounded-xl border border-border-main overflow-hidden">
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 hover:bg-bg-hover transition-colors border-b border-border-main"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
                <span className="font-medium">Theme</span>
              </div>
              <span className="text-sm text-text-muted capitalize">{theme}</span>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-bg-hover transition-colors border-b border-border-main">
              <div className="flex items-center gap-3">
                <Type size={20} className="text-text-muted" />
                <span className="font-medium">Font Size</span>
              </div>
              <span className="text-sm text-text-muted">Medium</span>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-bg-hover transition-colors">
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={20} className="text-text-muted" />
                <span className="font-medium">Editor Settings</span>
              </div>
            </button>
          </div>
        </section>

        {/* Others Section */}
        <section>
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 px-2">Others</h3>
          <div className="bg-bg-surface rounded-xl border border-border-main overflow-hidden">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors border-b border-border-main">
              <Info size={20} className="text-text-muted" />
              <span className="font-medium">About CodeIDE</span>
            </button>
            <div className="p-4 text-center">
              <p className="text-xs text-text-muted">Version 1.0.0 (Mobile)</p>
            </div>
          </div>
        </section>
        
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Save } from 'lucide-react';

export const AdminSettings = () => {
  const [siteName, setSiteName] = useState('CodeStudio IDE');
  const [maintenance, setMaintenance] = useState(false);

  const handleSave = () => {
    alert("Settings saved! (Mocked)");
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>
      
      <div className="bg-bg-surface border border-border-main rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-2">Site Name</label>
          <input 
            type="text" 
            value={siteName} 
            onChange={e => setSiteName(e.target.value)}
            className="w-full bg-bg-main border border-border-main rounded p-2 text-text-main focus:border-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="maintenance" 
            checked={maintenance}
            onChange={e => setMaintenance(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="maintenance" className="text-sm font-medium text-text-main">
            Enable Maintenance Mode
          </label>
        </div>

        <div className="pt-4 border-t border-border-main">
          <button 
            onClick={handleSave}
            className="bg-primary hover:bg-primary-hover text-bg-main font-bold py-2 px-6 rounded transition-colors flex items-center gap-2"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

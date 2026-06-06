import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { Users, FolderKanban, Activity } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, projects: 0, logs: 0 });
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };
    fetchStats();
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-surface p-6 rounded-xl border border-border-main flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-full">
            <Users size={32} />
          </div>
          <div>
            <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Total Users</p>
            <p className="text-3xl font-bold">{stats.users}</p>
          </div>
        </div>
        
        <div className="bg-bg-surface p-6 rounded-xl border border-border-main flex items-center gap-4">
          <div className="p-4 bg-green-500/10 text-green-500 rounded-full">
            <FolderKanban size={32} />
          </div>
          <div>
            <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Total Projects</p>
            <p className="text-3xl font-bold">{stats.projects}</p>
          </div>
        </div>

        <div className="bg-bg-surface p-6 rounded-xl border border-border-main flex items-center gap-4">
          <div className="p-4 bg-purple-500/10 text-purple-500 rounded-full">
            <Activity size={32} />
          </div>
          <div>
            <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Executions</p>
            <p className="text-3xl font-bold">{stats.logs}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

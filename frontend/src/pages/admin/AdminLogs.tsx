import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';

export const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/admin/logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      }
    };
    fetchLogs();
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Execution Logs</h1>
      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-hover text-text-muted text-sm uppercase tracking-wider">
              <th className="p-4 border-b border-border-main font-medium">User</th>
              <th className="p-4 border-b border-border-main font-medium">Language</th>
              <th className="p-4 border-b border-border-main font-medium">Status</th>
              <th className="p-4 border-b border-border-main font-medium">Duration</th>
              <th className="p-4 border-b border-border-main font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-border-main hover:bg-bg-hover/50 transition-colors">
                <td className="p-4 font-medium">{log.username}</td>
                <td className="p-4 text-primary">{log.language}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    log.status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="p-4 text-text-muted">{log.duration} ms</td>
                <td className="p-4 text-text-muted text-sm">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted">No execution logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

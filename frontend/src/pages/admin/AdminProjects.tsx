import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { Trash2 } from 'lucide-react';

export const AdminProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const { token } = useAuthStore();

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/admin/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Project Management</h1>
      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-hover text-text-muted text-sm uppercase tracking-wider">
              <th className="p-4 border-b border-border-main font-medium">Title</th>
              <th className="p-4 border-b border-border-main font-medium">Language</th>
              <th className="p-4 border-b border-border-main font-medium">Owner</th>
              <th className="p-4 border-b border-border-main font-medium">Last Modified</th>
              <th className="p-4 border-b border-border-main font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} className="border-b border-border-main hover:bg-bg-hover/50 transition-colors">
                <td className="p-4 font-medium">{p.title}</td>
                <td className="p-4 text-primary">{p.language}</td>
                <td className="p-4 text-text-muted">{p.owner}</td>
                <td className="p-4 text-text-muted text-sm">{new Date(p.last_modified).toLocaleString()}</td>
                <td className="p-4">
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Delete Project">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted">No projects found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

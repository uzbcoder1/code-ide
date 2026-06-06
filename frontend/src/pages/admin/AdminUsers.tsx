import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-hover text-text-muted text-sm uppercase tracking-wider">
              <th className="p-4 border-b border-border-main font-medium">ID</th>
              <th className="p-4 border-b border-border-main font-medium">Username</th>
              <th className="p-4 border-b border-border-main font-medium">Email</th>
              <th className="p-4 border-b border-border-main font-medium">Role</th>
              <th className="p-4 border-b border-border-main font-medium">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-border-main hover:bg-bg-hover/50 transition-colors">
                <td className="p-4">{u.id}</td>
                <td className="p-4 font-medium">{u.username}</td>
                <td className="p-4 text-text-muted">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-border-main text-text-muted'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-text-muted text-sm">{new Date(u.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

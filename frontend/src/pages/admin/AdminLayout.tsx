import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { LayoutDashboard, Users, FolderKanban, Activity, Settings, ArrowLeft, Loader2 } from 'lucide-react';

export const AdminLayout = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!token || !user || user.role !== 'admin') {
      navigate('/');
    } else {
      setIsChecking(false);
    }
  }, [user, token, navigate]);

  if (isChecking || !user || user.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main text-text-muted">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Projects', path: '/admin/projects', icon: <FolderKanban size={20} /> },
    { name: 'Logs', path: '/admin/logs', icon: <Activity size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-bg-main text-text-main">
      <div className="w-64 bg-bg-surface border-r border-border-main flex flex-col">
        <div className="p-4 border-b border-border-main flex items-center justify-between">
          <h2 className="font-bold text-lg text-primary">Admin Panel</h2>
          <Link to="/" className="text-text-muted hover:text-text-main" title="Back to IDE">
            <ArrowLeft size={20} />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 p-3 rounded transition-colors ${
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'text-text-muted hover:bg-bg-hover hover:text-text-main'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <Outlet />
      </div>
    </div>
  );
};

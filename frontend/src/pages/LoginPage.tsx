import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { FileCode } from 'lucide-react';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      // Request Token
      const tokenRes = await axios.post(`${import.meta.env.VITE_API_URL}/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = tokenRes.data.access_token;
      
      // Get User Info
      const userRes = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAuth(token, userRes.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center text-text-main p-4 transition-colors">
      <div className="bg-bg-surface w-full max-w-md p-8 rounded-xl shadow-2xl border border-border-main">
        <div className="flex flex-col items-center mb-8">
          <FileCode size={48} className="text-primary mb-4" />
          <h1 className="text-2xl font-bold">Welcome back to CodeStudio</h1>
          <p className="text-text-muted text-sm mt-2">Log in to sync your projects to the cloud</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text-muted">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-muted">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-2.5 rounded font-bold text-white transition-colors mt-2 ${loading ? 'bg-primary/50' : 'bg-primary hover:bg-primary-hover shadow-lg'}`}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-text-muted">
          Don't have an account? <Link to="/register" className="text-primary hover:underline font-medium">Create an account</Link>
        </div>
        <div className="mt-4 text-center text-sm">
          <Link to="/" className="text-text-muted hover:text-text-main transition-colors">Continue as Guest (Local Only)</Link>
        </div>
      </div>
    </div>
  );
};

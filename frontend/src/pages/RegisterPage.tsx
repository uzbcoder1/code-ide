import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileCode } from 'lucide-react';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      await axios.post('http://127.0.0.1:8000/register', {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password
      });
      
      // On success, go to login
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center text-text-main p-4 transition-colors">
      <div className="bg-bg-surface w-full max-w-lg p-8 rounded-xl shadow-2xl border border-border-main">
        <div className="flex flex-col items-center mb-8">
          <FileCode size={48} className="text-primary mb-4" />
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-text-muted text-sm mt-2">Join CodeStudio to sync projects to the cloud</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 text-text-muted">First Name</label>
            <input 
              type="text" 
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 text-text-muted">Last Name</label>
            <input 
              type="text" 
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-text-muted">Username</label>
            <input 
              type="text" 
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-text-muted">Email</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 text-text-muted">Password</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1 text-text-muted">Confirm</label>
            <input 
              type="password" 
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full bg-bg-hover border border-border-main rounded p-2.5 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className={`col-span-2 py-2.5 rounded font-bold text-white transition-colors mt-2 ${loading ? 'bg-primary/50' : 'bg-primary hover:bg-primary-hover shadow-lg'}`}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-text-muted">
          Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Log In</Link>
        </div>
      </div>
    </div>
  );
};

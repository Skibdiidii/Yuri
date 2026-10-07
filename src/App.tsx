import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatchNotesModal from './components/PatchNotesModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('catalystcord_user_token');
    const isAdmin = localStorage.getItem('isAdminDirect') === 'true' || localStorage.getItem('is_admin_mode') === 'true';
    return Boolean(token || isAdmin);
  });

  const [showPatchNotes, setShowPatchNotes] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('catalystcord_user_token');
      const isAdmin = localStorage.getItem('isAdminDirect') === 'true' || localStorage.getItem('is_admin_mode') === 'true';
      setIsAuthenticated(Boolean(token || isAdmin));
    };

    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('catalystcord_user_token');
    localStorage.removeItem('isAdminDirect');
    localStorage.removeItem('is_admin_mode');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}

      {showPatchNotes && (
        <PatchNotesModal onClose={() => setShowPatchNotes(false)} />
      )}
    </div>
  );
}

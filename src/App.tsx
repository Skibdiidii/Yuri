




import { useState, useEffect } from 'react';
import { api } from './services/api';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import CatalystCordTab from './components/CatalystCordTab';
import SystemConsoleTab from './components/SystemConsoleTab';
import FullscreenTerminal from './components/FullscreenTerminal';
import WindowManager from './components/WindowManager';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Shield, Terminal, MessageSquare, ChevronRight, Activity, Cpu, Sliders, ArrowLeft } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('token') || !!localStorage.getItem('catalystcord_user_token');
  });

  const [tokenUser, setTokenUser] = useState<any>(() => {
    const saved = localStorage.getItem('token_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [view, setView] = useState<'portal' | 'dashboard' | 'catalystcord_wss'>(() => {
    return 'portal';
  });

  const loggedInToken = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
  let loggedInUserId = '';
  try {
    if (loggedInToken) {
      loggedInUserId = atob(loggedInToken.split('.')[0]);
    }
  } catch (e) {}

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isUser1512 = [
    '1453843872286380218',
    '1512170544118894704',
    '1413100448482857081',
    '1462523761302437889',
    '1545389998315143229'
  ].includes(loggedInUserId);
  const isTerminalRoute = currentPath === '/terminal' || currentPath === '/console';

  const handleAdminLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('catalystcord_user_token');
    localStorage.removeItem('token_user');
    localStorage.removeItem('discord_user');
    setIsLoggedIn(false);
    setTokenUser(null);
    setView('portal');
  };

  useEffect(() => {
    if (isLoggedIn && loggedInToken) {
      
      api.login(loggedInToken)
        .then((res) => {
          localStorage.setItem('token', res.session.token);
          localStorage.setItem('catalystcord_user_token', res.session.token);
          localStorage.setItem('token_user', JSON.stringify(res.session));
          setTokenUser(res.session);
        })
        .catch((err) => {
          console.warn('Auto-login verification failed:', err);
          
          const errMsg = err.message || '';
          if (errMsg.includes('Invalid token') || errMsg.includes('401') || errMsg.includes('Unauthorized')) {
            handleAdminLogout();
          }
        });
    }
  }, [isLoggedIn, loggedInToken]);

  const handleLoginSuccess = () => {
    const saved = localStorage.getItem('token_user');
    try {
      setTokenUser(saved ? JSON.parse(saved) : null);
    } catch (e) {}
    setIsLoggedIn(true);
    setView('portal');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-white/20">
      <AnimatePresence mode="wait">
        {isTerminalRoute ? (
            <motion.div
              key="terminal_route"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 w-screen h-screen bg-[#050508] text-zinc-100 font-sans flex flex-col z-50 overflow-hidden"
            >
              <FullscreenTerminal 
                onBack={() => {
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new Event('popstate'));
                }} 
              />
            </motion.div>
        ) : !isLoggedIn ? (
          <motion.div 
            key="login_flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <Login onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        ) : (
          <>
            {view === 'portal' && (
              <motion.div 
                key="portal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-5xl mx-auto px-6 py-12 lg:py-24 flex flex-col justify-center min-h-screen"
              >
                <div className="mb-12 flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-medium tracking-tight text-white mb-2">
                        Welcome back, {tokenUser?.username || 'User'}
                    </h1>
                    <p className="text-sm text-zinc-500 font-normal">
                        Select a workspace environment to proceed.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                     {tokenUser?.avatar && (
                        <img 
                          src={tokenUser.avatar} 
                          className="w-9 h-9 rounded-full object-cover border border-white/10" 
                          alt="Avatar" 
                          referrerPolicy="no-referrer" 
                        />
                     )}
                    <button 
                      onClick={handleAdminLogout} 
                      className="text-xs px-4 py-2 hover:bg-white/5 text-zinc-400 hover:text-white rounded-md transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>

                <div className={`grid grid-cols-1 ${isUser1512 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setView('dashboard')}
                    className="bg-[#111] border border-white/10 hover:border-white/20 rounded-xl p-8 cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                      <Sliders className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-base font-medium text-white mb-2">Automation Console</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed font-normal">
                      Configure profile settings, presence, remote operations, server environments, and utility macros.
                    </p>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setView('catalystcord_wss')}
                    className="bg-[#111] border border-white/10 hover:border-white/20 rounded-xl p-8 cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                      <Terminal className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-base font-medium text-white mb-2">Gateway Client</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed font-normal">
                      Connect directly to the socket to interoperate across guild and private channels dynamically.
                    </p>
                  </motion.div>

                  {isUser1512 && (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        localStorage.setItem('isAdminDirect', 'true');
                        setView('dashboard');
                      }}
                      className="bg-[#111] border border-white/10 hover:border-white/20 rounded-xl p-8 cursor-pointer transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                        <Shield className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                      </div>
                      <h2 className="text-base font-medium text-white mb-2">Admin Dashboard</h2>
                      <p className="text-sm text-zinc-500 leading-relaxed font-normal">
                        Access control logs, telemetry sessions, and system parameters across daemon hosts.
                      </p>
                    </motion.div>
                  )}
                </div>

                <footer className="mt-16 text-center text-xs text-zinc-600 font-mono">
                  ©️ {new Date().getFullYear()} Yuri. All rights reserved. Registered design & custom client architecture.
                  <div className="text-[8px] text-zinc-800/20 select-none mt-6 tracking-widest opacity-20 hover:opacity-100 transition-opacity">
                    crafted by harumi (@myeyesaregoingdownx)
                  </div>
                </footer>
              </motion.div>
            )}

            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <Dashboard onLogout={handleAdminLogout} />
              </motion.div>
            )}

            {view === 'catalystcord_wss' && (
              <motion.div 
                key="catalystcord_wss"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <CatalystCordTab onBack={() => setView('portal')} />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

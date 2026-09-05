
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Sparkles, Shield, Rocket, Info } from 'lucide-react';

interface PatchNotesModalProps {
  onClose: () => void;
}

export default function PatchNotesModal({ onClose }: PatchNotesModalProps) {
  const updates = [
    {
      title: "Enhanced Presence Sync",
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      description: "Optimized the presence synchronization engine to ensure custom statuses and activities remain consistent across long sessions."
    },
    {
      title: "Network Optimization",
      icon: <Zap className="w-5 h-5 text-purple-400" />,
      description: "Improved global request orchestration for smoother concurrent operations and reduced latency during high-density traffic."
    },
    {
      title: "Logout Stability Fix",
      icon: <Info className="w-5 h-5 text-zinc-400" />,
      description: "Resolved a critical TypeError during the logout and system wipe process caused by database query builder limitations."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#111] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Info className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">What's New</h2>
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Patch v1.2.7-stable</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {updates.map((update, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 mt-1">
                {update.icon}
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-100 mb-1">{update.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                  {update.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
            <p className="text-[10px] text-zinc-600 font-normal italic">
              Click anywhere outside or hit ESC to close.
            </p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
            >
              Got it
            </button>
        </div>
      </motion.div>
    </div>
  );
}

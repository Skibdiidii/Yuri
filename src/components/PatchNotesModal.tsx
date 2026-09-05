
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Sparkles, Shield, Rocket, Info } from 'lucide-react';

interface PatchNotesModalProps {
  onClose: () => void;
}

export default function PatchNotesModal({ onClose }: PatchNotesModalProps) {
  const patchHistory = [
    {
      version: "1.2.7-stable",
      date: "September 2026",
      updates: [
        {
          title: "OAuth2 Core Integration",
          icon: <Rocket className="w-5 h-5 text-blue-400" />,
          description: "Implemented server-side persistence for OAuth2 tokens, enabling seamless account recovery and advanced fleet management."
        },
        {
          title: "Status Synchronization",
          icon: <Shield className="w-5 h-5 text-emerald-400" />,
          description: "Fixed presence overlap conflicts between global admin overrides and individual RPC rotation cycles."
        },
        {
          title: "Admin Dashboard Metrics",
          icon: <Zap className="w-5 h-5 text-purple-400" />,
          description: "Integrated real-time tracking for authorized identities and active daemon sessions."
        }
      ]
    },
    {
      version: "1.2.6-stable",
      date: "August 2026",
      updates: [
        {
          title: "Session Persistence Fix",
          icon: <Shield className="w-5 h-5 text-emerald-400" />,
          description: "Resolved an asynchronous race condition during system logout that previously caused database query errors."
        },
        {
          title: "Database Reliability",
          icon: <Zap className="w-5 h-5 text-blue-400" />,
          description: "Standardized Supabase operation patterns with improved error handling for bulk data pruning."
        }
      ]
    },
    {
      version: "1.2.5-stable",
      date: "July 2026",
      updates: [
        {
          title: "Voice Gateway Architecture",
          icon: <Zap className="w-5 h-5 text-red-400" />,
          description: "Initial rollout of the Voice Channel (VC) soundboard and neural stream injection engine."
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0A0A0C] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">System Changelog</h2>
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Version v1.2.7-stable</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-12 overflow-y-auto custom-scrollbar bg-[#0A0A0C]">
          {patchHistory.map((patch, patchIdx) => (
            <div key={patch.version} className="space-y-6 relative">
              <div className="flex items-center gap-4 sticky top-0 bg-[#0A0A0C] py-2 z-10">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-mono font-bold text-zinc-500 px-3 py-1 rounded-full border border-white/5 bg-zinc-900/50 uppercase tracking-[0.2em]">
                  {patch.version} — {patch.date}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {patch.updates.map((update, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 rounded-xl bg-zinc-900/20 border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="flex gap-5">
                      <div className="flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110">
                        {update.icon}
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-zinc-100 tracking-tight group-hover:text-blue-400 transition-colors uppercase">
                          {update.title}
                        </h3>
                        <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                          {update.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-center">
            <button 
              onClick={onClose}
              className="px-12 py-3 bg-white text-black text-[10px] font-black rounded-xl hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 uppercase tracking-[0.2em] active:scale-95"
            >
              Acknowledge Update
            </button>
        </div>
      </motion.div>
    </div>
  );
}

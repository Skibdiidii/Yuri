import React, { useState, useEffect } from 'react';
import { Skull, Ghost, Ban, Target, Search } from 'lucide-react';
import { api } from '../services/api';

export default function RevengeTab({ token, addLog }: { token: string, addLog: (msg: string) => void }) {
  const [userId, setUserId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [termedUsers, setTermedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchTermed();
  }, []);

  const fetchTermed = async () => {
    try {
      const res = await fetch('/api/actions/revenge/termed', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setTermedUsers(data.users || []);
      }
    } catch (e) {}
  };

  const handleAction = async (endpoint: string, body: any) => {
    try {
      const res = await fetch(`/api/actions/revenge/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        addLog(`Revenge action ${endpoint} successful`);
        fetchTermed();
      } else {
        const data = await res.json();
        addLog(`Revenge action ${endpoint} failed: ${data.error}`);
      }
    } catch (e) {
      addLog(`Revenge action ${endpoint} error: ${e}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-white/10 rounded-xl p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-500" />
            Revenge Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <input 
                    type="text"
                    placeholder="Discord User ID..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-red-500/50"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                />
                <input 
                    type="text"
                    placeholder="Channel ID (for ghost ping)..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-red-500/50"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleAction('term', { userId })} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3 rounded-lg text-xs font-bold uppercase">Term</button>
                <button onClick={() => handleAction('unterm', { userId })} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3 rounded-lg text-xs font-bold uppercase">Unterm</button>
                <button onClick={() => handleAction('block', { userId })} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3 rounded-lg text-xs font-bold uppercase">Block</button>
                <button onClick={() => handleAction('ghost-ping', { channelId, userId })} className="flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 p-3 rounded-lg text-xs font-bold uppercase"><Ghost size={14}/>Ghost Ping</button>
                <button onClick={() => handleAction('scrape-term', { userId })} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-3 rounded-lg text-xs font-bold uppercase">Scrape for Terming</button>
            </div>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-xl p-8">
        <h4 className="text-sm font-bold text-white mb-4">Termed Users ({termedUsers.length})</h4>
        <div className="space-y-2">
            {termedUsers.map(uid => (
                <div key={uid} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5 text-xs text-zinc-400 font-mono">
                    {uid}
                    <button onClick={() => handleAction('unterm', { userId: uid })} className="text-red-400 hover:text-red-300">Remove</button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

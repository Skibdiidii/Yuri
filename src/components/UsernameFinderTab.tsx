import React, { useState, useRef } from 'react';
import { Search, CheckCircle, Clock, StopCircle } from 'lucide-react';

interface UsernameFinderTabProps {
    token: string;
    addLog: (msg: string) => void;
}

export default function UsernameFinderTab({ token, addLog }: UsernameFinderTabProps) {
    const [isSearching, setIsSearching] = useState(false);
    const [foundUser, setFoundUser] = useState<string | null>(null);
    const searchRef = useRef(false);

    const generateRandomName = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const length = Math.floor(Math.random() * 3) + 2; 
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const startSearch = async () => {
        setIsSearching(true);
        searchRef.current = true;
        setFoundUser(null);
        addLog(`Started automatic searching for 2-4 letter usernames...`);
        
        while (searchRef.current) {
            const randomName = generateRandomName();
            try {
                const res = await fetch(`/api/username/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token },
                    body: JSON.stringify({ baseName: randomName })
                });
                const data = await res.json();
                
                if (data.available) {
                    setFoundUser(data.username);
                    addLog(`Found available username: ${data.username}!`);
                    searchRef.current = false;
                    setIsSearching(false);
                    break;
                } else {
                    addLog(`Username ${data.username} taken. Retrying...`);
                }
            } catch (e) {
                addLog(`Error checking username: ${e}`);
                searchRef.current = false;
                setIsSearching(false);
                break;
            }
            
            await new Promise(r => setTimeout(r, 200));
        }
    };

    const stopSearch = () => {
        searchRef.current = false;
        setIsSearching(false);
        addLog('Search stopped by user.');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-500" />
                    Username 2-4 Finder
                </h3>

                <div className="flex gap-2">
                    <button 
                        onClick={startSearch}
                        disabled={isSearching}
                        className="flex-1 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSearching ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {isSearching ? 'Searching...' : 'Generate & Search'}
                    </button>
                    {isSearching && (
                        <button 
                            onClick={stopSearch}
                            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <StopCircle className="w-4 h-4" />
                            Stop
                        </button>
                    )}
                </div>

                {foundUser && (
                    <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                        <CheckCircle className="w-5 h-5" />
                        <span>Found available username: <b>{foundUser}</b>. Please apply it manually to your account settings!</span>
                    </div>
                )}
            </div>
        </div>
    );
}

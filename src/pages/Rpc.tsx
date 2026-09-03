import React, { useState, useEffect } from 'react';
import { Save, Trash2, ExternalLink, Info, Upload, Download, Copy, CheckCircle } from 'lucide-react';
import { RpcConfig } from '../types';

const API_BASE = '';
const OWNER_ID = '1413100448482857081'; 

interface CommunityPreset extends RpcConfig {
    id: string;
    uploaderId: string;
    uploaderUsername: string;
    downloads: number;
}

export default function Rpc({ configs, setConfigs, selectedIndex, setSelectedIndex, hoursElapsed, setHoursElapsed }: Omit<RpcProps, 'token' | 'setToken'>) {
    const token = (localStorage.getItem('token') || '').trim().replace(/^["']|["']$/g, '');
    const config = configs[selectedIndex];
    const setConfig = (newConfig: RpcConfig | ((prev: RpcConfig) => RpcConfig)) => {
        setConfigs(prev => {
            const next = [...prev];
            next[selectedIndex] = typeof newConfig === 'function' ? newConfig(next[selectedIndex]) : newConfig;
            return next;
        });
    };
    const [status, setStatus] = useState('');
    const [uploading, setUploading] = useState(false);
    const [communityPresets, setCommunityPresets] = useState<CommunityPreset[]>([]);
    const [activeTab, setActiveTab] = useState<'my_presets' | 'community'>('my_presets');

    const currentUser = React.useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('token_user') || '{}');
        } catch {
            return {};
        }
    }, [token]);

    useEffect(() => {
        const saved = localStorage.getItem('rpcCommunityPresets');
        if (saved) {
            try {
                setCommunityPresets(JSON.parse(saved));
            } catch {}
        }
    }, []);

    const saveCommunityPresets = (newPresets: CommunityPreset[]) => {
        setCommunityPresets(newPresets);
        localStorage.setItem('rpcCommunityPresets', JSON.stringify(newPresets));
    };

    const handleUploadToCommunity = () => {
        if (!config.name && !config.details) {
            setStatus('RPC must have a name or details to upload.');
            return;
        }
        
        const newPreset: CommunityPreset = {
            ...config,
            id: Math.random().toString(36).substring(2, 9),
            uploaderId: currentUser.id || 'unknown',
            uploaderUsername: currentUser.username || 'Anonymous',
            downloads: 0
        };

        const next = [newPreset, ...communityPresets];
        saveCommunityPresets(next);
        setStatus('Preset Uploaded to Community!');
    };

    const handleDownloadPreset = (preset: CommunityPreset) => {
        const nextConfigs = [...configs];
        
        
        const { id, uploaderId, uploaderUsername, downloads, ...rpcData } = preset;
        
        nextConfigs.push(rpcData as RpcConfig);
        setConfigs(nextConfigs);
        setSelectedIndex(nextConfigs.length - 1);
        
        const nextPresets = communityPresets.map(p => p.id === preset.id ? { ...p, downloads: (p.downloads || 0) + 1 } : p);
        saveCommunityPresets(nextPresets);
        
        setStatus('Preset downloaded & applied! Go to My Presets to save it.');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'large' | 'small') => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            const file = e.target.files[0];
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                const aspectRatio = (type === 'large' && config.applicationId === '1015931589851959326') ? '2:3' : '1:1';

                const res = await fetch(`${API_BASE}/api/rpc/upload-image?aspectRatio=${aspectRatio}`, {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Upload failed');
                }
                
                const data = await res.json();
                if (data.url) {
                    setConfig(prev => ({
                        ...prev,
                        [type === 'large' ? 'largeImageKey' : 'smallImageKey']: data.url
                    }));
                    setStatus('Image uploaded successfully!');
                } else {
                    setStatus('Upload failed: No URL returned');
                }
            } catch (err) {
                setStatus(`Upload error: ${err}`);
            } finally {
                setUploading(false);
            }
        }
    };

    const handleUpdate = React.useCallback(async () => {
        setStatus('Updating...');
        
        
        const finalConfigs = configs.map((c, i) => {
            let finalConfig = { ...c };
            
            
            if (i === selectedIndex && hoursElapsed) {
                const elapsedVal = parseFloat(hoursElapsed);
                if (!isNaN(elapsedVal)) {
                    
                    finalConfig.startTimestamp = (Date.now() - (elapsedVal * 60 * 1000)).toString();
                }
            }
            
            
            if (finalConfig.endTimestamp) {
                const endVal = parseFloat(finalConfig.endTimestamp);
                if (!isNaN(endVal)) {
                    if (endVal < 100000) {
                        
                        finalConfig.endTimestamp = (Date.now() + (endVal * 60 * 1000)).toString();
                    }
                }
            }
            return finalConfig;
        });

        try {
            const res = await fetch(`${API_BASE}/api/rpc/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ 
                    token, 
                    configs: finalConfigs,
                    selectedIndex
                })
            });
            
            let data;
            const text = await res.text();
            try {
                data = JSON.parse(text);
            } catch (err) {
                throw new Error(`Server returned invalid response: ${text.substring(0, 50)}...`);
            }

            if (data.success) {
                setStatus('RPC Updated Successfully!');
            } else {
                setStatus(`Error: ${data.error}`);
            }
        } catch (e) {
            setStatus(`${e}`);
        }
    }, [configs, selectedIndex, token, hoursElapsed]);

    const handleClear = async () => {
        try {
            await fetch(`${API_BASE}/api/rpc/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ token })
            });
            setStatus('RPC Cleared');
        } catch (e) {
            setStatus(`Error: ${e}`);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto text-zinc-100">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <ExternalLink className="w-8 h-8 text-indigo-500" />
                Rich Presence (RPC)
            </h1>

            <div className="flex items-center justify-between gap-4 mb-6 border-b border-white/10 pb-2">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('my_presets')}
                        className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'my_presets' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        My Presets
                    </button>
                    <button 
                        onClick={() => setActiveTab('community')}
                        className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'community' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Community Uploads
                    </button>
                </div>
            </div>

            {activeTab === 'my_presets' ? (
            <div className="bg-black/20 border border-white/10 rounded-xl p-6 mb-8">
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                        {configs.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setSelectedIndex(i);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedIndex === i ? 'bg-indigo-600 text-white' : 'bg-black/20 border border-white/10 text-zinc-400 hover:bg-white/5'}`}
                            >
                                RPC {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setConfigs([...configs, { ...configs[selectedIndex] }]);
                                setSelectedIndex(configs.length);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-black/20 border border-white/10 text-zinc-400 hover:bg-white/5"
                        >
                            + Add
                        </button>
                        <button
                            onClick={() => {
                                setConfig(prev => ({
                                    ...prev,
                                    name: 'Yuri Client',
                                    details: 'Managing Automated Tasks',
                                    state: 'Status: Optimal',
                                    largeImageKey: 'yuri_logo',
                                    largeImageText: 'Yuri v2.0',
                                    button1Label: 'Documentation',
                                    button1Url: 'https://github.com',
                                    button2Label: 'Support',
                                    button2Url: 'https://discord.gg',
                                    type: 'PLAYING',
                                    url: '',
                                    applicationId: '1219356399120158720',
                                    startTimestamp: Date.now().toString()
                                }));
                                setStatus('Rich Display Preset Applied!');
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30"
                        >
                            Rich Display Preset
                        </button>
                        <button
                            onClick={() => {
                                setConfig({
                                    name: 'Playing',
                                    details: '',
                                    state: '',
                                    largeImageKey: '',
                                    largeImageText: '',
                                    smallImageKey: '',
                                    smallImageText: '',
                                    button1Label: '',
                                    button1Url: '',
                                    button2Label: '',
                                    button2Url: '',
                                    type: 'PLAYING',
                                    url: '',
                                    applicationId: '1015931589851959326', 
                                    startTimestamp: Date.now().toString()
                                });
                                setStatus('Portrait Preset Applied!');
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                        >
                            Portrait Preset
                        </button>
                        {configs.length > 1 && (
                        <button
                            onClick={() => {
                                const next = configs.filter((_, i) => i !== selectedIndex);
                                setConfigs(next);
                                setSelectedIndex(Math.max(0, selectedIndex - 1));
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-900/50 text-red-200 hover:bg-red-800"
                        >
                            Delete
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-zinc-300 border-b border-zinc-800 pb-2">Configuration</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Activity Type</label>
                                <select 
                                    value={config.type || 'PLAYING'}
                                    onChange={e => setConfig({...config, type: e.target.value as any})}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300"
                                >
                                    <option value="PLAYING">Playing</option>
                                    <option value="STREAMING">Streaming</option>
                                    <option value="LISTENING">Listening</option>
                                    <option value="WATCHING">Watching</option>
                                    <option value="COMPETING">Competing</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Activity Platform</label>
                                <select 
                                    value={config.platform || 'desktop'}
                                    onChange={e => setConfig({...config, platform: e.target.value as any})}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300"
                                >
                                    <option value="desktop">Desktop</option>
                                    <option value="android">Android</option>
                                    <option value="ios">iOS</option>
                                    <option value="xbox">Xbox</option>
                                    <option value="samsung">Samsung</option>
                                    <option value="playstation">PlayStation</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Application ID (Optional)</label>
                                <input 
                                    type="text" 
                                    value={config.applicationId || ''}
                                    onChange={e => setConfig({...config, applicationId: e.target.value})}
                                    placeholder="e.g. 802969373265592330"
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Activity Name (e.g. "Watching", "Playing")</label>
                            <input 
                                type="text" 
                                value={config.name || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setConfig({...config, name: e.target.value})
                                }}
                                placeholder="Watching"
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Streaming URL (Twitch/YouTube)</label>
                            <input 
                                type="text" 
                                value={config.url || ''}
                                onChange={e => setConfig({...config, url: e.target.value})}
                                placeholder="https://..."
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                            />
                            <p className="text-[9px] text-zinc-600 mt-1 italic">
                                Used for Streaming or Watch links.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Title</label>
                            <input 
                                type="text" 
                                value={config.details || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setConfig({...config, details: e.target.value})
                                }}
                                placeholder=""
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">State</label>
                            <input 
                                type="text" 
                                value={config.state || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setConfig({...config, state: e.target.value})
                                }}
                                placeholder=""
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Large Image URL (CDN Link Preferred)</label>
                            <div className="flex flex-col gap-2">
                                <input 
                                    type="text" 
                                    value={config.largeImageKey || ''}
                                    onChange={e => setConfig({...config, largeImageKey: e.target.value})}
                                    placeholder="https://..."
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500">Alternative:</span>
                                    <label className={`flex items-center gap-2 px-3 py-1 bg-black/20 hover:bg-white/5 border border-white/10 rounded cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <Upload size={14} className="text-zinc-400" />
                                        <span className="text-[10px] text-zinc-400">Upload Image</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => handleImageUpload(e, 'large')}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Large Image Text</label>
                            <input 
                                type="text" 
                                value={config.largeImageText || ''}
                                onChange={e => setConfig({...config, largeImageText: e.target.value})}
                                placeholder="Hover text..."
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Small Image URL</label>
                            <div className="flex flex-col gap-2">
                                <input 
                                    type="text" 
                                    value={config.smallImageKey || ''}
                                    onChange={e => setConfig({...config, smallImageKey: e.target.value})}
                                    placeholder="https://..."
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500">Alternative:</span>
                                    <label className={`flex items-center gap-2 px-3 py-1 bg-black/20 hover:bg-white/5 border border-white/10 rounded cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <Upload size={14} className="text-zinc-400" />
                                        <span className="text-[10px] text-zinc-400">Upload Image</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => handleImageUpload(e, 'small')}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Small Image Text</label>
                            <input 
                                type="text" 
                                value={config.smallImageText || ''}
                                onChange={e => setConfig({...config, smallImageText: e.target.value})}
                                placeholder="Small hover text..."
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                            <h3 className="text-sm font-medium text-zinc-400">Buttons</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Button 1 Label</label>
                                    <input 
                                        type="text" 
                                        value={config.button1Label || ''}
                                        onChange={e => setConfig({...config, button1Label: e.target.value})}
                                        placeholder="Label"
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Button 1 URL</label>
                                    <input 
                                        type="text" 
                                        value={config.button1Url || ''}
                                        onChange={e => setConfig({...config, button1Url: e.target.value})}
                                        placeholder="https://..."
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Button 2 Label</label>
                                    <input 
                                        type="text" 
                                        value={config.button2Label || ''}
                                        onChange={e => setConfig({...config, button2Label: e.target.value})}
                                        placeholder="Label"
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Button 2 URL</label>
                                    <input 
                                        type="text" 
                                        value={config.button2Url || ''}
                                        onChange={e => setConfig({...config, button2Url: e.target.value})}
                                        placeholder="https://..."
                                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Time Elapsed (Minutes)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={hoursElapsed}
                                        onChange={e => setHoursElapsed(e.target.value.replace(/[^0-9.]/g, ''))}
                                        placeholder="e.g. 5, 24, 120..."
                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-1">
                                    Enter the number of minutes to show as elapsed time (e.g., "5" will show "05:00 elapsed").
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">Time Remaining / End Time (Minutes)</label>
                                <input 
                                    type="text"
                                    value={config.endTimestamp || ''}
                                    onChange={e => setConfig({...config, endTimestamp: e.target.value})}
                                    placeholder="Minutes remaining (e.g. 10)"
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-4">
                    <button 
                        onClick={handleUpdate}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        Set Presence
                    </button>
                    <button 
                        onClick={handleUploadToCommunity}
                        className="px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        title="Upload this preset to Community"
                    >
                        <Upload size={18} />
                        Publish
                    </button>
                    <button 
                        onClick={handleClear}
                        className="px-6 bg-black/20 border border-white/10 hover:bg-red-900/50 text-zinc-300 hover:text-red-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={18} />
                        Clear
                    </button>
                </div>

                {status && (
                    <div className="mt-4 p-3 bg-black/20 border border-white/10 rounded text-sm text-center text-zinc-400 font-bold">
                        {status}
                    </div>
                )}
            </div>
            ) : (
                <div className="bg-black/20 border border-white/10 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Community RPC Presets</h2>
                    <p className="text-sm text-zinc-400 mb-6">Discover and download Rich Presence designs created by the community.</p>

                    {communityPresets.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-zinc-500">
                            No community presets yet. Be the first to upload one from "My Presets"!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {communityPresets.map((preset) => (
                                <div key={preset.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-indigo-400 text-lg">{preset.name || 'Unknown Activity'}</span>
                                            </div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                                                <Download className="w-3 h-3" /> {preset.downloads}
                                            </div>
                                        </div>
                                        <div className="text-sm text-zinc-300 mb-2 truncate">{preset.details || 'No details'}</div>
                                        <div className="text-xs text-zinc-500 mb-4 truncate">{preset.state || 'No state'}</div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-auto">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-400">By <b>{preset.uploaderUsername}</b></span>
                                            {preset.uploaderId === OWNER_ID && (
                                                <span className="bg-indigo-600 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase text-white shadow shadow-indigo-500/50 flex items-center gap-1">
                                                    <CheckCircle className="w-2.5 h-2.5" />
                                                    Owner
                                                </span>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleDownloadPreset(preset)}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Get
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface RpcProps {
    configs: RpcConfig[];
    setConfigs: React.Dispatch<React.SetStateAction<RpcConfig[]>>;
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    hoursElapsed: string;
    setHoursElapsed: (hours: string) => void;
}

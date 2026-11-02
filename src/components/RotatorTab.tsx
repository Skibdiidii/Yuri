import React, { useState } from 'react';
import { RefreshCw, Plus, Trash2, Save, Upload } from 'lucide-react';
import { RpcConfig } from '../types';

interface RotatorTabProps {
    token: string;
    addLog: (msg: string) => void;
}

export default function RotatorTab({ token, addLog }: RotatorTabProps) {
    const [configs, setConfigs] = useState<RpcConfig[]>([{ 
        name: '', details: '', state: '', largeImageKey: '', largeImageText: '', smallImageKey: '', smallImageText: '', 
        button1Label: '', button1Url: '', button2Label: '', button2Url: '', type: 'PLAYING', url: '', startTimestamp: '' 
    }]);
    const [interval, setInterval] = useState(30);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    const addConfig = () => {
        if (configs.length >= 5) {
            addLog("Maximum 5 rotating activities allowed.");
            return;
        }
        setConfigs([...configs, { 
            name: '', details: '', state: '', largeImageKey: '', largeImageText: '', smallImageKey: '', smallImageText: '', 
            button1Label: '', button1Url: '', button2Label: '', button2Url: '', type: 'PLAYING', url: '', startTimestamp: '' 
        }]);
    };

    const removeConfig = (index: number) => {
        setConfigs(configs.filter((_, i) => i !== index));
    };

    const updateConfig = (index: number, field: keyof RpcConfig, value: string) => {
        const newConfigs = [...configs];
        
        newConfigs[index] = { ...newConfigs[index], [field]: value };
        setConfigs(newConfigs);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            setUploadingIndex(index);
            const file = e.target.files[0];
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                
                const res = await fetch(`/api/rpc/upload-image?aspectRatio=1:1`, {
                    method: 'POST',
                    headers: { 'Authorization': token },
                    body: formData
                });
                
                if (!res.ok) {
                    throw new Error('Upload failed');
                }
                const data = await res.json();
                if (data.url) {
                    updateConfig(index, 'largeImageKey', data.url);
                    addLog('Image uploaded successfully!');
                } else {
                    addLog('Upload failed: No URL returned');
                }
            } catch (err) {
                addLog(`Upload error: ${err}`);
            } finally {
                setUploadingIndex(null);
            }
        }
    };

    const saveRotator = async () => {
        try {
            const res = await fetch('/api/rpc/rotator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ configs, interval })
            });
            if (res.ok) {
                addLog('Rotator settings saved');
            } else {
                addLog('Failed to save rotator settings');
            }
        } catch (e) {
            addLog(`Error saving rotator: ${e}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-500" />
                    RPC Rotator
                </h3>

                <div className="mb-6">
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase">Rotation Interval (seconds)</label>
                    <input 
                        type="number"
                        value={interval}
                        onChange={(e) => setInterval(parseInt(e.target.value))}
                        className="w-32 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                    />
                </div>

                <div className="space-y-4">
                    {configs.map((config, index) => (
                        <div key={index} className="p-4 bg-black/20 border border-white/10 rounded-xl flex flex-wrap gap-4 items-center">
                            <input placeholder="Name" className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm w-32" value={config.name || ''} onChange={(e) => updateConfig(index, 'name', e.target.value)} />
                            <input placeholder="Title" className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm w-32" value={config.details || ''} onChange={(e) => updateConfig(index, 'details', e.target.value)} />
                            <input placeholder="State" className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm w-32" value={config.state || ''} onChange={(e) => updateConfig(index, 'state', e.target.value)} />
                            
                            <div className="flex-1 min-w-[200px] flex gap-2">
                                <input 
                                    placeholder="Large Image URL" 
                                    className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1" 
                                    value={config.largeImageKey || ''} 
                                    onChange={(e) => updateConfig(index, 'largeImageKey', e.target.value)} 
                                />
                                <label className={`flex items-center gap-2 px-3 py-2 bg-black/20 hover:bg-white/5 border border-white/10 rounded-lg cursor-pointer transition-colors ${uploadingIndex === index ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <Upload size={14} className="text-zinc-400" />
                                    <input 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/gif" 
                                        className="hidden" 
                                        onChange={(e) => handleImageUpload(e, index)}
                                        disabled={uploadingIndex === index}
                                    />
                                </label>
                            </div>
                            
                            <button onClick={() => removeConfig(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                    <button onClick={addConfig} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors" disabled={configs.length >= 5}>
                        <Plus className="w-4 h-4" /> Add Activity {configs.length >= 5 ? '(Max 5)' : ''}
                    </button>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={saveRotator} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save & Activate
                    </button>
                </div>
            </div>
        </div>
    );
}

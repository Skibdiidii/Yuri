import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, User, FileAudio, Play, Pause, Loader2, CheckCircle2, AlertCircle, Trash2, Search, MessageSquare, Reply } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

interface AudioVmTabProps {
    token: string;
    addLog: (msg: string) => void;
}

interface ResolvedRecipient {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
    type: 'user' | 'channel';
}

export default function AudioVmTab({ token, addLog }: AudioVmTabProps) {
    const [recipientId, setRecipientId] = useState('');
    const [replyMessageId, setReplyMessageId] = useState('');
    const [loadingRecipient, setLoadingRecipient] = useState(false);
    const [resolvedRecipient, setResolvedRecipient] = useState<ResolvedRecipient | null>(null);
    const [recipientError, setRecipientError] = useState('');
    const [manualType, setManualType] = useState<'user' | 'channel' | null>(null);

    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [waveformB64, setWaveformB64] = useState<string>('');
    const [isDecoding, setIsDecoding] = useState(false);

    
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<string>('');
    const [sendSuccess, setSendSuccess] = useState(false);
    const [sendError, setSendError] = useState('');

    
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleResolveRecipient = async () => {
        if (!recipientId.trim()) return;
        setLoadingRecipient(true);
        setRecipientError('');
        setResolvedRecipient(null);

        const id = recipientId.trim();
        try {
            
            addLog(`Resolving recipient: ${id}`);
            const userUrl = `https://discord.com/api/v10/users/${id}`;
            const res = await api.discordGet(token, userUrl);
            
            if (res && res.id) {
                setResolvedRecipient({
                    id: res.id,
                    username: res.username,
                    global_name: res.global_name,
                    avatar: res.avatar ? `https://cdn.discordapp.com/avatars/${res.id}/${res.avatar}.png` : undefined,
                    type: 'user'
                });
                addLog(`Successfully resolved user: ${res.username}`);
                return;
            }
        } catch (e: any) {
            
            try {
                const channelUrl = `https://discord.com/api/v9/channels/${id}`;
                const res = await api.discordGet(token, channelUrl);
                if (res && res.id) {
                    setResolvedRecipient({
                        id: res.id,
                        username: res.name || `Channel #${res.id}`,
                        type: 'channel'
                    });
                    addLog(`Successfully resolved channel: ${res.name || res.id}`);
                    return;
                }
            } catch (err) {
                
            }
            setRecipientError('Could not resolve recipient ID. Make sure it is a valid User ID or Channel ID.');
            addLog(`Failed to resolve recipient: ${e.message || e}`);
        } finally {
            setLoadingRecipient(false);
        }
    };

    const processAudioFile = async (file: File) => {
        setAudioFile(file);
        setSendSuccess(false);
        setSendError('');
        
        
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        const url = URL.createObjectURL(file);
        setAudioUrl(url);

        setIsDecoding(true);
        addLog(`Analyzing audio file: ${file.name}`);

        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await file.arrayBuffer();
            
            
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const rawDuration = audioBuffer.duration;
            setDuration(rawDuration);
            addLog(`Audio duration: ${rawDuration.toFixed(2)} seconds`);

            
            const channelData = audioBuffer.getChannelData(0);
            const numPoints = 128;
            const step = Math.floor(channelData.length / numPoints) || 1;
            const sampled: number[] = [];

            for (let i = 0; i < numPoints; i++) {
                const start = i * step;
                let sum = 0;
                for (let j = 0; j < step && (start + j) < channelData.length; j++) {
                    sum += Math.abs(channelData[start + j]);
                }
                const avg = sum / step;
                
                const byteVal = Math.min(255, Math.floor(avg * 255 * 8));
                sampled.push(byteVal);
            }

            const uint8 = new Uint8Array(sampled);
            const b64 = btoa(String.fromCharCode(...uint8));
            setWaveformB64(b64);
            addLog(`Waveform analyzed and encoded successfully`);
        } catch (err: any) {
            addLog(`Waveform analysis failed (unsupported format in browser or no AudioContext): ${err.message}`);
            
            const tempAudio = new Audio(url);
            tempAudio.addEventListener('loadedmetadata', () => {
                setDuration(tempAudio.duration || 5);
            });

            
            const sampled: number[] = [];
            for (let i = 0; i < 100; i++) {
                const factor = Math.sin((i / 100) * Math.PI);
                const val = Math.floor(factor * (60 + Math.random() * 120));
                sampled.push(val);
            }
            const uint8 = new Uint8Array(sampled);
            const b64 = btoa(String.fromCharCode(...uint8));
            setWaveformB64(b64);
        } finally {
            setIsDecoding(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processAudioFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processAudioFile(e.dataTransfer.files[0]);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
    };

    const handleSendVoiceMessage = async () => {
        const targetRecipient = resolvedRecipient || (recipientId.trim().match(/^\d{17,20}$/) && manualType ? {
            id: recipientId.trim(),
            username: `Recipient (${recipientId.trim()})`,
            type: manualType
        } as ResolvedRecipient : null);

        if (!audioFile || !targetRecipient) return;
        setIsSending(true);
        setSendError('');
        setSendSuccess(false);

        try {
            let targetChannelId = '';

            
            if (targetRecipient.type === 'user') {
                setSendStatus('Opening direct message channel...');
                addLog(`Creating DM channel with user: ${targetRecipient.username} (${targetRecipient.id})`);
                
                let dmRes;
                try {
                    
                    addLog(`Attempting to open DM via recipients array (user token format)...`);
                    dmRes = await api.discordPost(
                        token,
                        'https://discord.com/api/v9/users/@me/channels',
                        { recipients: [targetRecipient.id] },
                        'POST',
                        true
                    );
                    if (!dmRes || !dmRes.id) throw new Error('First attempt empty response');
                } catch (e: any) {
                    addLog(`First DM attempt failed (${e.message || e}), trying recipient_id fallback...`);
                    try {
                        dmRes = await api.discordPost(
                            token,
                            'https://discord.com/api/v9/users/@me/channels',
                            { recipient_id: targetRecipient.id },
                            'POST',
                            true
                        );
                    } catch (err: any) {
                        throw new Error(`Failed to establish DM channel: ${err.message || err}`);
                    }
                }

                if (dmRes && dmRes.id) {
                    targetChannelId = dmRes.id;
                    addLog(`DM channel established: ${dmRes.id}`);
                } else {
                    throw new Error('Failed to establish DM channel with recipient.');
                }
            } else {
                targetChannelId = targetRecipient.id;
                addLog(`Using direct channel ID: ${targetChannelId}`);
            }

            
            setSendStatus('Requesting Discord upload slot...');
            addLog(`Requesting attachment slot in channel ${targetChannelId}`);
            
            const attachRes = await api.discordPost(
                token,
                `https://discord.com/api/v9/channels/${targetChannelId}/attachments`,
                {
                    files: [
                        {
                            filename: 'voice-message.ogg',
                            file_size: audioFile.size,
                            id: '0'
                        }
                    ]
                },
                'POST',
                true
            );

            if (!attachRes || !attachRes.attachments || attachRes.attachments.length === 0) {
                throw new Error('Failed to acquire Discord attachment upload slot.');
            }

            const attachment = attachRes.attachments[0];
            const uploadUrl = attachment.upload_url;
            const uploadedFilename = attachment.upload_filename;

            addLog(`Acquired upload URL. Upload filename: ${uploadedFilename}`);

            
            setSendStatus('Uploading audio to AWS S3 (via proxy)...');
            addLog(`Uploading raw binary to S3 slot via proxy...`);

            const proxyUploadUrl = `/api/catalystcord/proxy?url=${encodeURIComponent(uploadUrl)}&method=PUT`;
            const uploadRes = await fetch(proxyUploadUrl, {
                method: 'POST', 
                headers: {
                    'Content-Type': 'audio/ogg'
                },
                body: audioFile
            });

            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                throw new Error(`S3 upload rejected with status: ${uploadRes.status}. Details: ${errText}`);
            }

            addLog('Raw audio binary successfully uploaded to AWS S3.');

            
            setSendStatus('Sending Discord Voice Message...');
            addLog('Finalizing voice message payload...');

            const finalPayload: any = {
                flags: 8192, 
                attachments: [
                    {
                        id: '0',
                        filename: 'voice-message.ogg',
                        uploaded_filename: uploadedFilename,
                        duration_secs: duration || 5,
                        waveform: waveformB64
                    }
                ]
            };

            if (replyMessageId.trim()) {
                finalPayload.message_reference = {
                    channel_id: targetChannelId,
                    message_id: replyMessageId.trim()
                };
                addLog(`Replying to message ID: ${replyMessageId.trim()}`);
            }

            const sendRes = await api.discordPost(
                token,
                `https://discord.com/api/v9/channels/${targetChannelId}/messages`,
                finalPayload,
                'POST',
                true
            );

            if (sendRes && sendRes.id) {
                setSendSuccess(true);
                addLog(`Voice Message sent successfully! Message ID: ${sendRes.id}`);
                setSendStatus('Voice Message sent successfully!');
                
                setAudioFile(null);
                setWaveformB64('');
                setDuration(0);
            } else {
                throw new Error('Discord rejected final message submission.');
            }
        } catch (err: any) {
            console.error('Failed to send voice message:', err);
            setSendError(err.message || 'Unknown sending error occurred.');
            addLog(`Voice Message failed: ${err.message || err}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2 relative z-10">
                    <Mic className="w-5 h-5 text-indigo-500" />
                    Discord Voice Message (VM) Sender
                </h3>
                <p className="text-xs text-zinc-400 mb-8 relative z-10">
                    Send real audio files masquerading as native mobile Discord voice messages, complete with authentic waveforms and playback metadata.
                </p>

                <div className="space-y-6 relative z-10">
                    {}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Recipient ID (User ID or DM Channel ID)
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                                    <User className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Enter user or channel snowflake ID..."
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 text-white font-mono placeholder:text-zinc-600"
                                    value={recipientId}
                                    onChange={(e) => {
                                        setRecipientId(e.target.value);
                                        setResolvedRecipient(null);
                                        setRecipientError('');
                                        setManualType(null);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleResolveRecipient()}
                                />
                            </div>
                            <button
                                onClick={handleResolveRecipient}
                                disabled={loadingRecipient || !recipientId.trim()}
                                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg text-sm transition-all flex items-center gap-2 border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingRecipient ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <Search className="w-4 h-4" />}
                                Resolve
                            </button>
                        </div>
                        {recipientError && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {recipientError}
                            </p>
                        )}
                        {!resolvedRecipient && recipientId.trim().match(/^\d{17,20}$/) && (
                            <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs mt-2">
                                <div className="text-zinc-400">
                                    <span className="font-semibold text-zinc-300">Direct Send Bypass:</span> Profile resolution failed/skipped. Choose recipient type to send directly:
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setManualType('user')}
                                        className={`px-3 py-1.5 rounded-md font-medium border transition-all ${
                                            manualType === 'user'
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                : 'bg-black/20 border-white/5 hover:border-white/10 text-zinc-400'
                                        }`}
                                    >
                                        Direct Message (User ID)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManualType('channel')}
                                        className={`px-3 py-1.5 rounded-md font-medium border transition-all ${
                                            manualType === 'channel'
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                                : 'bg-black/20 border-white/5 hover:border-white/10 text-zinc-400'
                                        }`}
                                    >
                                        Group / Server (Channel ID)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reply Message ID Field */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Reply className="w-3.5 h-3.5 text-indigo-400" />
                                Reply Message ID (Optional)
                            </label>
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold uppercase tracking-wider">
                                Reply VM Mode
                            </span>
                        </div>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                                <MessageSquare className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Enter Message ID to reply to (e.g. 134567890123456789)..."
                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 text-white font-mono placeholder:text-zinc-600"
                                value={replyMessageId}
                                onChange={(e) => setReplyMessageId(e.target.value)}
                            />
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            If specified, the voice message will be attached directly as a inline reply to this message.
                        </p>
                    </div>

                    {}
                    <AnimatePresence>
                        {resolvedRecipient && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 overflow-hidden"
                            >
                                {resolvedRecipient.avatar ? (
                                    <img src={resolvedRecipient.avatar} alt="Avatar" className="w-12 h-12 rounded-full border border-indigo-500/20 shadow-lg shadow-indigo-500/10" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                        <User className="w-5 h-5 text-indigo-400" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white">
                                        {resolvedRecipient.global_name || resolvedRecipient.username}
                                    </h4>
                                    <p className="text-xs text-zinc-500 font-mono">
                                        @{resolvedRecipient.username} ({resolvedRecipient.id})
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                                    {resolvedRecipient.type === 'user' ? 'Direct Message' : 'Group/Channel'}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Voice Message File
                        </label>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                                isDragging
                                    ? 'border-indigo-500 bg-indigo-500/5'
                                    : audioFile
                                    ? 'border-emerald-500/30 bg-emerald-500/[0.01]'
                                    : 'border-zinc-800 hover:border-zinc-700 hover:bg-white/[0.01]'
                            }`}
                        >
                            <input
                                type="file"
                                id="audio-upload"
                                accept="audio/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="audio-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                {isDecoding ? (
                                    <>
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                        <span className="text-sm text-zinc-400 font-medium">Extracting Audio Waveform...</span>
                                    </>
                                ) : audioFile ? (
                                    <>
                                        <FileAudio className="w-8 h-8 text-emerald-400" />
                                        <span className="text-sm text-zinc-200 font-medium mt-1">{audioFile.name}</span>
                                        <span className="text-xs text-zinc-500 font-mono mt-0.5">
                                            {(audioFile.size / 1024 / 1024).toFixed(2)} MB • {duration ? `${duration.toFixed(1)}s` : 'Analyzing...'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <FileAudio className="w-8 h-8 text-zinc-600" />
                                        <span className="text-sm text-zinc-400 font-medium mt-1">Drag & Drop audio file here</span>
                                        <span className="text-xs text-zinc-600 mt-0.5">Supports MP3, WAV, OGG, M4A, etc.</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    {}
                    {audioUrl && (
                        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4">
                            <button
                                onClick={togglePlay}
                                className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20"
                            >
                                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                            </button>
                            <div className="flex-1">
                                <p className="text-xs text-zinc-400 font-semibold mb-1">Audio Preview</p>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                                    {}
                                    <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none opacity-20">
                                        {Array.from({ length: 40 }).map((_, i) => (
                                            <span
                                                key={i}
                                                className="w-[2px] bg-indigo-400 rounded-full"
                                                style={{ height: `${Math.sin((i / 40) * Math.PI) * (40 + Math.random() * 60)}%` }}
                                            />
                                        ))}
                                    </div>
                                    <motion.div
                                        className="h-full bg-indigo-500 rounded-full"
                                        animate={{ width: isPlaying ? '100%' : '0%' }}
                                        transition={{ duration: duration || 5, ease: 'linear' }}
                                    />
                                </div>
                            </div>
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onEnded={handleAudioEnded}
                                className="hidden"
                            />
                            <button
                                onClick={() => {
                                    setAudioFile(null);
                                    setWaveformB64('');
                                    setDuration(0);
                                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                                    setAudioUrl(null);
                                    setIsPlaying(false);
                                }}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {}
                    {(isSending || sendSuccess || sendError) && (
                        <div className={`p-4 rounded-xl border text-sm flex gap-3 ${
                            sendSuccess
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                : sendError
                                ? 'bg-red-500/5 border-red-500/20 text-red-400'
                                : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-400'
                        }`}>
                            {sendSuccess ? (
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            ) : sendError ? (
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                            )}
                            <div>
                                <h5 className="font-bold">
                                    {sendSuccess ? 'Success!' : sendError ? 'Error Sending VM' : 'Processing...'}
                                </h5>
                                <p className="text-xs text-zinc-400 mt-0.5">{sendStatus || sendError}</p>
                            </div>
                        </div>
                    )}

                    {}
                    <div className="flex justify-end pt-4 border-t border-zinc-800">
                        <button
                            onClick={handleSendVoiceMessage}
                            disabled={isSending || !audioFile || (!resolvedRecipient && (!recipientId.trim().match(/^\d{17,20}$/) || !manualType))}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending VM...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Voice Message
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

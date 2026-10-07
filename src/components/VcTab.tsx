import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Square, MicOff, Headphones, Video, Monitor, Youtube, Image as ImageIcon, Film, Music, Volume2, RefreshCw, Upload, Radio, Pause, RotateCcw, Trash2, Sliders, VolumeX, FileAudio, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function VcTab({ token }: { token: string }) {
  const [vcId, setVcId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [isTtsTesting, setIsTtsTesting] = useState(false);
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  
  const [sbEnabled, setSbEnabled] = useState(true);
  const [sbSounds, setSbSounds] = useState<any[]>([]);
  const [selectedSbId, setSelectedSbId] = useState('random');
  const [sbInterval, setSbInterval] = useState(2000);
  const [isSbSpamming, setIsSbSpamming] = useState(false);

  const [micAudioFile, setMicAudioFile] = useState<{ url: string; name: string } | null>(null);
  const [isMicAudioUploading, setIsMicAudioUploading] = useState(false);
  const [isMicAudioTransmitting, setIsMicAudioTransmitting] = useState(false);
  const [micAudioLoop, setMicAudioLoop] = useState(false);
  const [micAudioInterval, setMicAudioInterval] = useState(1000);
  const [micAudioVolume, setMicAudioVolume] = useState(100);
  const [micAudioLibrary, setMicAudioLibrary] = useState<Array<{ url: string; name: string }>>(() => {
    try {
      const saved = localStorage.getItem('vc_audio_library');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const [status, setStatus] = useState('');
  const [streamType, setStreamType] = useState<'image' | 'video' | 'youtube'>('image');
  const [streamUrl, setStreamUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [streamResolution, setStreamResolution] = useState('720');
  const [streamOrientation, setStreamOrientation] = useState('landscape');
  const [streamLoop, setStreamLoop] = useState(true);
  const [streamVolume, setStreamVolume] = useState('100');

  useEffect(() => {
    const fetchSounds = async () => {
      const defaultSounds = [
        { id: "1", name: "Quack", emoji: "🦆", url: "https://actions.google.com/sounds/v1/animals/duck_quack.ogg" },
        { id: "2", name: "Airhorn", emoji: "📢", url: "https://actions.google.com/sounds/v1/alarms/air_horn_01.ogg" },
        { id: "3", name: "Cricket", emoji: "🦗", url: "https://actions.google.com/sounds/v1/animals/crickets_chirping.ogg" },
        { id: "4", name: "Buzzer", emoji: "🚨", url: "https://actions.google.com/sounds/v1/alarms/digital_alarm_clock.ogg" },
        { id: "5", name: "Applause", emoji: "👏", url: "https://actions.google.com/sounds/v1/crowds/applause_cheer.ogg" },
        { id: "6", name: "Laugh", emoji: "😂", url: "https://actions.google.com/sounds/v1/human_voices/group_laughter.ogg" }
      ];
      try {
        const sounds = await api.getSoundboardSounds(token);
        if (Array.isArray(sounds) && sounds.length > 0) {
          setSbSounds(sounds);
        } else {
          setSbSounds(defaultSounds);
        }
      } catch (err) {
        console.error('Failed to fetch soundboard sounds:', err);
        setSbSounds(defaultSounds);
      }
    };
    fetchSounds();
  }, [token]);

  const handleJoinVc = async () => {
    try {
      const res = await api.joinVC(token, vcId);
      if (res.error) {
        setStatus(`Error: ${res.error}`);
      } else {
        setStatus(res.message || 'Joined VC successfully!');
      }
    } catch (err) {
      setStatus(`Error joining VC: ${err}`);
    }
  };

  const handleMute = async () => {
    try {
      const newState = !isMuted;
      await api.setMute(token, newState);
      setIsMuted(newState);
      setStatus(newState ? 'Muted' : 'Unmuted');
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  };

  const handleDeafen = async () => {
    try {
      const newState = !isDeafened;
      await api.setDeafen(token, newState);
      setIsDeafened(newState);
      setStatus(newState ? 'Deafened' : 'Undeafened');
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  };

  const handleVideo = async () => {
    try {
      const newState = !isVideoOn;
      await api.setVideo(token, newState);
      setIsVideoOn(newState);
      setStatus(newState ? 'Camera On' : 'Camera Off');
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  };

  const handleTtsSpeak = async () => {
    if (!ttsText) return;
    try {
      setIsTtsSpeaking(true);
      await api.speakTTS(token, ttsText, 'en');
      setStatus('TTS Sent to VC');
    } catch (err) {
      setStatus(`TTS Error: ${err}`);
    } finally {
      setIsTtsSpeaking(false);
    }
  };

  const handleTtsTest = async () => {
    if (!ttsText) return;
    try {
      setIsTtsTesting(true);
      const res = await api.testTTS(ttsText, 'en');
      if (res.audioUrl) {
        const audio = new Audio(res.audioUrl);
        await audio.play().catch(e => {
          console.error("[TTS TEST] Play call failed:", e);
          setStatus(`TTS Play Error: ${e.message}`);
        });
      }
    } catch (err) {
      setStatus(`TTS Test Error: ${err}`);
    } finally {
      setIsTtsTesting(false);
    }
  };

  const handleSbPlay = async () => {
    try {
      const id = selectedSbId === 'random' 
        ? sbSounds[Math.floor(Math.random() * sbSounds.length)]?.id 
        : selectedSbId;
      if (!id) return;
      await api.playSoundboard(token, id);
      setStatus('SoundBoard Played');
    } catch (err) {
      setStatus(`SB Error: ${err}`);
    }
  };

  const handleSbTest = () => {
    const sound = selectedSbId === 'random' 
      ? sbSounds[Math.floor(Math.random() * sbSounds.length)]
      : sbSounds.find(s => s.id === selectedSbId);
    if (sound?.url) {
      
      const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(sound.url)}`;
      console.log(`[SB TEST] Playing: ${sound.name} via ${proxyUrl}`);
      const audio = new Audio(proxyUrl);
      audio.onplay = () => console.log(`[SB TEST] Playback started for ${sound.name}`);
      audio.onerror = (e) => {
        console.error(`[SB TEST] Playback error for ${sound.name}:`, e);
        setStatus("Failed to load sound source. Try another sound.");
      };
      audio.play().catch(err => {
        console.error(`[SB TEST] Play call failed for ${sound.name}:`, err);
        setStatus(`Playback error: ${err.message}`);
      });
    }
  };

  const handleSbSpamToggle = async () => {
    try {
      const newState = !isSbSpamming;
      await api.toggleSoundboardSpam(token, newState, selectedSbId, sbInterval);
      setIsSbSpamming(newState);
      setStatus(newState ? 'SoundBoard Spam Started' : 'SoundBoard Spam Stopped');
    } catch (err) {
      setStatus(`SB Spam Error: ${err}`);
    }
  };

  const handleMicAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsMicAudioUploading(true);
      setStatus('Uploading audio file...');
      const res = await api.uploadVcAudio(token, file);
      if (res.error) {
        setStatus(`Upload failed: ${res.error}`);
      } else if (res.url) {
        const item = { url: res.url, name: res.name || file.name };
        setMicAudioFile(item);
        setMicAudioLibrary(prev => {
          const filtered = prev.filter(x => x.url !== item.url);
          const next = [item, ...filtered].slice(0, 15);
          localStorage.setItem('vc_audio_library', JSON.stringify(next));
          return next;
        });
        setStatus(`Uploaded ${item.name}. Preview below before confirming.`);
      }
    } catch (err: any) {
      setStatus(`Upload error: ${err?.message || err}`);
    } finally {
      setIsMicAudioUploading(false);
    }
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current || !micAudioFile) return;
    if (previewPlaying) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setPreviewPlaying(true);
      }).catch(() => {
        setStatus('Preview failed to load audio');
      });
    }
  };

  const handleMicAudioTransmit = async () => {
    if (!micAudioFile) return;
    try {
      if (isMicAudioTransmitting) {
        await api.stopVcAudio(token);
        setIsMicAudioTransmitting(false);
        setStatus('Stopped mic audio output');
      } else {
        const res = await api.playVcAudio(token, {
          fileUrl: micAudioFile.url,
          name: micAudioFile.name,
          loop: micAudioLoop,
          interval: micAudioInterval,
          volume: micAudioVolume
        });
        if (res.error) {
          setStatus(`Transmission error: ${res.error}`);
        } else {
          setIsMicAudioTransmitting(true);
          setStatus(`Now outputting "${micAudioFile.name}" on VC mic!`);
        }
      }
    } catch (err: any) {
      setStatus(`Error transmitting: ${err?.message || err}`);
    }
  };

  const handleStopMicAudio = async () => {
    try {
      await api.stopVcAudio(token);
      setIsMicAudioTransmitting(false);
      setStatus('Stopped mic audio output');
    } catch (err) {}
  };

  useEffect(() => {
    if (!token) return;
    const checkStatus = async () => {
      try {
        const s = await api.getVcAudioStatus(token);
        if (s && typeof s.isPlaying === 'boolean') {
          setIsMicAudioTransmitting(s.isPlaying);
        }
      } catch (e) {}
    };
    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setStatus('Uploading media...');
      const res = await api.uploadStreamMedia(token, file);
      if (res.error) {
        setStatus(`Upload error: ${res.error}`);
      } else {
        setStreamUrl(res.url);
        setStatus(`Media uploaded: ${res.originalName}`);
      }
    } catch (err) {
      setStatus(`Upload failed: ${err}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStream = async () => {
    try {
      if (isStreaming) {
        await api.stopStream(token);
        setIsStreaming(false);
        setStatus('Stopped screenshare.');
      } else {
        if (streamUrl) {
            await api.setStreamSource(token, streamType, streamUrl, { resolution: streamResolution, orientation: streamOrientation, loop: streamLoop, volume: streamVolume });
        }
        const res = await api.startStream(token, vcId);
        if (res.error) {
          setStatus(`Error: ${res.error}`);
        } else {
          setIsStreaming(true);
          setStatus('Started VC Screenshare (Go Live)!');
        }
      }
    } catch (err) {
      setStatus(`Error streaming: ${err}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Voice Channel Control</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={vcId}
              onChange={(e) => setVcId(e.target.value)}
              placeholder="Voice Channel ID"
              className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={handleJoinVc}
              className="px-4 py-2 bg-black/20 border border-white/10 hover:bg-white/5 text-zinc-300 rounded-lg text-sm transition-all flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Join VC
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleMute}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${isMuted ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-black/20 border-white/10 text-zinc-400 hover:bg-white/5'}`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="text-[10px] uppercase font-bold tracking-wider">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button
              onClick={handleDeafen}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${isDeafened ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-black/20 border-white/10 text-zinc-400 hover:bg-white/5'}`}
            >
              <Headphones className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{isDeafened ? 'Undeafen' : 'Deafen'}</span>
            </button>
            <button
              onClick={handleVideo}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${isVideoOn ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/20 border-white/10 text-zinc-400 hover:bg-white/5'}`}
            >
              <Video className="w-5 h-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{isVideoOn ? 'Stop Cam' : 'Camera'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-300">Text-to-Speech (TTS)</h3>
          <button 
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${ttsEnabled ? 'bg-emerald-500 text-white' : 'bg-black/20 border border-white/10 text-zinc-500 hover:bg-white/5'}`}
          >
            {ttsEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {ttsEnabled && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Message</label>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Type something for the selfbot to say..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 min-h-[80px] resize-none"
                />
              </div>
              <div className="w-32 pb-1">
                <button 
                  onClick={handleTtsTest}
                  disabled={isTtsTesting || !ttsText}
                  className="w-full py-2 bg-black/20 border border-white/10 hover:bg-white/5 text-zinc-300 rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTtsTesting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-zinc-300"></div> : <Play className="w-3 h-3" />}
                  Test
                </button>
              </div>
            </div>

            <button
              onClick={handleTtsSpeak}
              disabled={isTtsSpeaking || !ttsText}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-3 transition-all text-sm font-medium disabled:opacity-50"
            >
              {isTtsSpeaking ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Mic className="w-4 h-4" />}
              Speak in VC
            </button>
          </div>
        )}
      </div>

      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-300">SoundBoard</h3>
          <button 
            onClick={() => setSbEnabled(!sbEnabled)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${sbEnabled ? 'bg-indigo-500 text-white' : 'bg-black/20 border border-white/10 text-zinc-500 hover:bg-white/5'}`}
          >
            {sbEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {sbEnabled && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Select Sound</label>
                <select 
                  value={selectedSbId}
                  onChange={(e) => setSelectedSbId(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
                >
                  <option value="random">Random Sound</option>
                  {sbSounds.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.name} {s.guildName ? `(${s.guildName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button 
                  onClick={handleSbTest}
                  className="flex-1 py-2 bg-black/20 border border-white/10 hover:bg-white/5 text-zinc-300 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-3 h-3" />
                  Test
                </button>
                <button 
                  onClick={handleSbPlay}
                  className="flex-1 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Play
                </button>
              </div>
            </div>

            <div className="bg-black/20 border border-white/10 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-zinc-300">Spam Mode</p>
                  <p className="text-[10px] text-zinc-500">Repeatedly play sound in VC</p>
                </div>
                <button
                  onClick={handleSbSpamToggle}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isSbSpamming ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isSbSpamming ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Interval (ms)</label>
                  <span className="text-[10px] font-mono text-indigo-400">{sbInterval}ms</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="100"
                  value={sbInterval}
                  onChange={(e) => setSbInterval(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-medium text-zinc-200">Mic Audio File Transmitter</h3>
              <p className="text-[10px] text-zinc-500">Upload audio clips (MP3/WAV/OGG), preview in-browser, and output directly to VC mic</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
            isMicAudioTransmitting 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' 
              : 'bg-black/20 border border-white/10 text-zinc-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isMicAudioTransmitting ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
            {isMicAudioTransmitting ? 'Transmitting on Mic' : 'Mic Idle'}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block w-full cursor-pointer">
            <div className="w-full bg-black/20 border border-white/10 border-dashed rounded-lg px-4 py-5 text-sm text-zinc-400 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all flex flex-col items-center justify-center gap-2">
              {isMicAudioUploading ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-400" />
                  <span className="text-xs">Uploading & processing audio...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-300">
                    {micAudioFile ? 'Upload Different Audio File' : 'Click to Upload Audio File (MP3, WAV, OGG, M4A)'}
                  </span>
                  <span className="text-[10px] text-zinc-500">Outputs directly through selfbot microphone into voice channel</span>
                </>
              )}
            </div>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              className="hidden"
              onChange={handleMicAudioUpload}
              disabled={isMicAudioUploading}
            />
          </label>

          {micAudioFile && (
            <div className="bg-black/30 border border-emerald-500/20 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileAudio className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">{micAudioFile.name}</p>
                    <p className="text-[10px] text-emerald-400/80 font-mono">Ready for VC mic transmission</p>
                  </div>
                </div>
                <button
                  onClick={() => setMicAudioFile(null)}
                  className="p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Remove selected file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    Preview Sound (In-Browser Before Confirming)
                  </span>
                  <span className="font-mono text-zinc-500">
                    {Math.floor(previewCurrentTime)}s / {Math.floor(previewDuration) || 0}s
                  </span>
                </div>

                <audio
                  ref={previewAudioRef}
                  src={micAudioFile.url}
                  onTimeUpdate={(e) => setPreviewCurrentTime((e.target as HTMLAudioElement).currentTime)}
                  onLoadedMetadata={(e) => setPreviewDuration((e.target as HTMLAudioElement).duration)}
                  onEnded={() => setPreviewPlaying(false)}
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePreviewPlay}
                    className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-zinc-200 hover:text-emerald-300 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {previewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max={previewDuration || 100}
                    step="0.1"
                    value={previewCurrentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      setPreviewCurrentTime(t);
                      if (previewAudioRef.current) previewAudioRef.current.currentTime = t;
                    }}
                    className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="bg-black/20 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-zinc-300 font-medium">Loop Audio</span>
                    <p className="text-[10px] text-zinc-500">Repeat sound in VC</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={micAudioLoop}
                      onChange={(e) => setMicAudioLoop(e.target.checked)}
                    />
                    <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400 uppercase font-bold tracking-wider">Repeat Interval</span>
                    <span className="font-mono text-emerald-400">{micAudioInterval}ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="200"
                    disabled={!micAudioLoop}
                    value={micAudioInterval}
                    onChange={(e) => setMicAudioInterval(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-30"
                  />
                  <p className="text-[9px] text-zinc-500">Delay between repetitions</p>
                </div>

                <div className="bg-black/20 border border-white/5 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400 uppercase font-bold tracking-wider">Mic Volume</span>
                    <span className="font-mono text-emerald-400">{micAudioVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={micAudioVolume}
                    onChange={(e) => setMicAudioVolume(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <p className="text-[9px] text-zinc-500">Output volume level</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleMicAudioTransmit}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2.5 text-sm font-semibold transition-all cursor-pointer ${
                    isMicAudioTransmitting
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 shadow-lg shadow-red-500/10'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.99]'
                  }`}
                >
                  {isMicAudioTransmitting ? (
                    <>
                      <Square className="w-4 h-4" />
                      Stop VC Mic Output
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Confirm & Output to VC Mic
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {micAudioLibrary.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Saved Audio Clips ({micAudioLibrary.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto no-scrollbar">
                {micAudioLibrary.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                      micAudioFile?.url === item.url 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : 'bg-black/20 border-white/5 text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    <button
                      onClick={() => setMicAudioFile(item)}
                      className="flex-1 text-left truncate text-xs font-medium cursor-pointer"
                    >
                      {item.name}
                    </button>
                    <button
                      onClick={() => {
                        setMicAudioLibrary(prev => {
                          const next = prev.filter(x => x.url !== item.url);
                          localStorage.setItem('vc_audio_library', JSON.stringify(next));
                          return next;
                        });
                        if (micAudioFile?.url === item.url) setMicAudioFile(null);
                      }}
                      className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 opacity-60 hover:opacity-100" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-300">Screenshare (Go Live)</h3>
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${isStreaming ? 'bg-red-500 text-white animate-pulse' : 'bg-black/20 border border-white/10 text-zinc-500'}`}>
            {isStreaming ? 'Live' : 'Offline'}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setStreamType('image')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${streamType === 'image' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-black/20 border border-white/10 text-zinc-500 hover:bg-white/5'}`}
            >
              <ImageIcon className="w-3 h-3" />
              Image
            </button>
            <button 
              onClick={() => setStreamType('video')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${streamType === 'video' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-black/20 border border-white/10 text-zinc-500 hover:bg-white/5'}`}
            >
              <Film className="w-3 h-3" />
              Video
            </button>
            <button 
              onClick={() => { setStreamType('youtube'); setStreamUrl(''); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${streamType === 'youtube' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-black/20 border border-white/10 text-zinc-500 hover:bg-white/5'}`}
            >
              <Youtube className="w-3 h-3" />
              YouTube
            </button>
          </div>

          {streamType === 'youtube' ? (
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="YouTube URL..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
            />
          ) : (
            <div className="space-y-2">
              <label className="block w-full cursor-pointer">
                <div className="w-full bg-black/20 border border-white/10 border-dashed rounded-lg px-4 py-4 text-sm text-zinc-500 hover:border-zinc-600 transition-all flex flex-col items-center gap-2">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                  ) : (
                    <>
                      <Monitor className="w-5 h-5 opacity-50" />
                      <span>{streamUrl ? 'Change File' : `Upload ${streamType === 'image' ? 'Image' : 'Video'}`}</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept={streamType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
              {streamUrl && (
                <p className="text-[10px] text-emerald-500 font-medium truncate px-1">
                  Ready: {streamUrl.split('/').pop()}
                </p>
              )}
            </div>
          )}

          {}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stream Settings</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Resolution</label>
                <select value={streamResolution} onChange={(e) => setStreamResolution(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500">
                  <option value="720">Normal HD (720p)</option>
                  <option value="1080">High Quality HD (1080p)</option>
                  <option value="1440">Ultra HD (1440p)</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400">Orientation</label>
                <select value={streamOrientation} onChange={(e) => setStreamOrientation(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-black/20 border border-white/10 p-3 rounded-lg">
                <span className="text-xs text-zinc-300">Loop Media</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={streamLoop} onChange={(e) => setStreamLoop(e.target.checked)} />
                  <div className="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>

              <div className="space-y-1 bg-black/20 border border-white/10 p-2 rounded-lg">
                <label className="text-[10px] text-zinc-400 block px-1">Volume</label>
                <input type="range" min="0" max="100" value={streamVolume} onChange={(e) => setStreamVolume(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="w-3 h-3 text-indigo-400" />
                Realtime Discord Screen Live Preview
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {streamResolution}p @ 30 FPS • {streamOrientation}
              </span>
            </div>

            <div className="relative bg-[#111214] border border-[#232428] rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[220px]">
              {streamUrl ? (
                streamType === 'image' ? (
                  <div className="relative w-full h-56 flex items-center justify-center bg-black/80">
                    <img 
                      src={streamUrl} 
                      alt="Stream Preview" 
                      className={`max-h-full max-w-full object-contain ${streamOrientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'}`} 
                    />
                  </div>
                ) : streamType === 'video' ? (
                  <div className="relative w-full h-56 flex items-center justify-center bg-black/80">
                    <video 
                      src={streamUrl} 
                      controls 
                      autoPlay 
                      loop={streamLoop} 
                      muted 
                      className={`max-h-full max-w-full object-contain ${streamOrientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'}`} 
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-56 flex items-center justify-center bg-black/80">
                    <iframe
                      src={streamUrl.includes('youtube.com/watch?v=') ? streamUrl.replace('watch?v=', 'embed/') : streamUrl}
                      title="YouTube Stream Preview"
                      className="w-full h-full border-0"
                    />
                  </div>
                )
              ) : (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-600">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">No active stream source loaded</p>
                  <p className="text-[10px] text-zinc-600">Upload an image/video or paste a YouTube URL to preview live output</p>
                </div>
              )}

              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 shadow-md ${
                  isStreaming 
                    ? 'bg-red-600 text-white animate-pulse' 
                    : 'bg-black/70 text-zinc-400 border border-white/10 backdrop-blur-md'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-white animate-ping' : 'bg-zinc-500'}`} />
                  {isStreaming ? 'LIVE ON DISCORD' : 'PREVIEW READY'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 text-zinc-300 border border-white/10 backdrop-blur-md">
                  {streamResolution}p
                </span>
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/70 text-zinc-400 border border-white/10 backdrop-blur-md flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-indigo-400" />
                  {streamVolume}%
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed pt-2">
            This will start a real Discord Screenshare session in the voice channel. 
            Others will see the "Live" badge next to your name. Note that media streams run in full-screen to avoid the "minimized" effect.
          </p>
          
          <button
            onClick={handleStream}
            className={`w-full py-3 ${isStreaming ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'} border rounded-lg flex items-center justify-center gap-3 transition-all text-sm font-medium`}
          >
            {isStreaming ? <Square className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            {isStreaming ? 'Stop Screenshare' : 'Go Live (Screenshare)'}
          </button>
        </div>
        {status && <p className="text-xs text-zinc-500 mt-3 italic">{status}</p>}
      </div>
    </div>
  );
}

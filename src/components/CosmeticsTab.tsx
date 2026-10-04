import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Sparkles, Check, Info, Plus, Award, Palette, Image, Smile, Save, BadgeAlert } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

interface CustomBadge {
  id: string;
  icon: string; 
  tooltip: string;
}

interface CosmeticsTabProps {
  token: string;
  addLog: (msg: string) => void;
  loggedInUserId?: string;
  loggedInUsername?: string;
  loggedInAvatar?: string;
}

export default function CosmeticsTab({ token, addLog, loggedInUserId, loggedInUsername, loggedInAvatar }: CosmeticsTabProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  
  const [newBadgeTooltip, setNewBadgeTooltip] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('');
  const [badgeFileError, setBadgeFileError] = useState('');

  
  const [nitroType, setNitroType] = useState<'None' | 'Classic' | 'Boost' | 'Basic'>('Boost');
  const [bannerType, setBannerType] = useState<'color' | 'gradient' | 'image'>('gradient');
  const [profileBanner, setProfileBanner] = useState('#8A2BE2');
  const [bannerPresetIndex, setBannerPresetIndex] = useState(-1);
  const [profileThemePrimary, setProfileThemePrimary] = useState('#8A2BE2');
  const [profileThemeSecondary, setProfileThemeSecondary] = useState('#10111A');
  const [avatarDecoration, setAvatarDecoration] = useState<string>('cyberpunk');
  const [customStatus, setCustomStatus] = useState('Modded Discord Client ✨');
  const [customStatusEmoji, setCustomStatusEmoji] = useState('🚀');
  const [aboutMe, setAboutMe] = useState('Configure premium profile styling features.');
  
  
  const [badgeQuest, setBadgeQuest] = useState(false);

  
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([]);

  
  const userDisplayName = loggedInUsername || 'SelfbotUser';
  const usernameClean = loggedInUsername ? loggedInUsername.toLowerCase() : 'user';
  const displayAvatar = loggedInAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=400&q=80';

  
  useEffect(() => {
    async function loadCosmetics() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await api.getCosmetics(token);
        if (data) {
          setNitroType(data.nitroType || 'Boost');
          setBannerType(data.bannerType || 'gradient');
          setProfileBanner(data.profileBanner || '#8A2BE2');
          setProfileThemePrimary(data.profileThemePrimary || '#8A2BE2');
          setProfileThemeSecondary(data.profileThemeSecondary || '#10111A');
          setAvatarDecoration(data.avatarDecoration || 'cyberpunk');
          setCustomStatus(data.customStatus || 'Modded Discord Client ✨');
          setCustomStatusEmoji(data.customStatusEmoji || '🚀');
          setAboutMe(data.aboutMe || 'Configure premium profile styling features.');
          
          
          setBadgeQuest(!!data.badgeQuest);

          
          setCustomBadges(data.customBadges || []);
        }
      } catch (e: any) {
        console.error('Failed to load user cosmetics:', e);
      } finally {
        setLoading(false);
      }
    }
    loadCosmetics();
  }, [token]);

  
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        nitroType,
        bannerType,
        profileBanner,
        profileThemePrimary,
        profileThemeSecondary,
        avatarDecoration,
        customStatus,
        customStatusEmoji,
        aboutMe,
        badgeQuest,
        customBadges
      };

      const res = await api.updateCosmetics(token, payload);
      if (res.success) {
        addLog('Saved client profile premium cosmetics and badges successfully');
      } else {
        alert('Failed to save cosmetics on servers.');
      }
    } catch (e: any) {
      alert(`Save error: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  
  const handleBadgeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setBadgeFileError('Image too large! Maximum allowed size is 2MB.');
      return;
    }
    setBadgeFileError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewBadgeIcon(reader.result as string);
    };
    reader.onerror = () => {
      setBadgeFileError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  
  const handleAddCustomBadge = () => {
    if (!newBadgeIcon) {
      setBadgeFileError('Please select or upload a badge icon/GIF first!');
      return;
    }
    const tooltip = newBadgeTooltip.trim() || 'Custom Medal';
    const newBadge: CustomBadge = {
      id: Math.random().toString(36).substring(2, 9),
      icon: newBadgeIcon,
      tooltip
    };
    setCustomBadges(prev => [...prev, newBadge]);
    setNewBadgeIcon('');
    setNewBadgeTooltip('');
    setBadgeFileError('');
    addLog(`Created new custom client badge: "${tooltip}"`);
  };

  const handleRemoveCustomBadge = (id: string, name: string) => {
    setCustomBadges(prev => prev.filter(b => b.id !== id));
    addLog(`Removed custom badge: "${name}"`);
  };

  
  const setPresetColors = (prim: string, sec: string, idx: number) => {
    setProfileThemePrimary(prim);
    setProfileThemeSecondary(sec);
    setBannerPresetIndex(idx);
    if (bannerType === 'color') {
      setProfileBanner(prim);
    } else if (bannerType === 'gradient') {
      setProfileBanner(`linear-gradient(135deg, ${prim} 0%, ${sec} 100%)`);
    }
  };

  return (
    <div className="space-y-8 pb-16 text-zinc-300" id="cosmetics_tab_panel">
      {}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          Yuri Client-Side Customizer
        </h3>
        <p className="text-sm text-zinc-400 max-w-4xl leading-relaxed">
          Customize official statuses, custom presence attributes, profile layout themes, and custom indicators. All settings persist locally.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {}
        <div className="lg:col-span-7 space-y-8">
          
          {}
          <div className="bg-[#10111A]/60 border border-white/10 rounded-2xl p-6 space-y-6">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Palette className="w-4 h-4 text-pink-400" />
              1. Profile Customization
            </h4>

            {}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs uppercase text-zinc-400 font-semibold mb-2">Emoji</label>
                <input 
                  type="text" 
                  value={customStatusEmoji}
                  onChange={(e) => setCustomStatusEmoji(e.target.value)}
                  placeholder="🚀"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-center text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase text-zinc-400 font-semibold mb-2">Custom Status Text</label>
                <input 
                  type="text" 
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="Discord Yuri client user"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            {}
            <div>
              <label className="block text-xs uppercase text-zinc-400 font-semibold mb-2">About Me (Bio)</label>
              <textarea 
                rows={3}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Write your beautiful custom bio..."
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            {}
            <div>
              <label className="block text-xs uppercase text-zinc-400 font-semibold mb-2.5">Fake Nitro Premium Tier</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['None', 'Basic', 'Classic', 'Boost'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setNitroType(tier)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      nitroType === tier 
                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50 shadow-sm shadow-indigo-500/10' 
                        : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    {tier === 'Boost' ? 'Nitro Boost' : `Nitro ${tier}`}
                  </button>
                ))}
              </div>
            </div>

            {}
            <div>
              <label className="block text-xs uppercase text-zinc-400 font-semibold mb-2.5">Avatar Decoration Rings (FX)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'cyberpunk', label: 'Neon Cyberpunk' },
                  { id: 'fire', label: 'Hellfire Rings' },
                  { id: 'sakura', label: 'Cherry Sakura' },
                  { id: 'galaxy', label: 'Cosmic Nebula' },
                  { id: 'gold_crown', label: 'Royal Crown' }
                ].map((dec) => (
                  <button
                    key={dec.id}
                    type="button"
                    onClick={() => setAvatarDecoration(dec.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      avatarDecoration === dec.id 
                        ? 'bg-pink-600/20 text-pink-400 border-pink-500/50 shadow-sm shadow-pink-500/10' 
                        : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {dec.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {}
          <div className="bg-[#10111A]/60 border border-white/10 rounded-2xl p-6 space-y-6">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Palette className="w-4 h-4 text-purple-400" />
              2. Premium Styling & Themes
            </h4>

            {}
            <div>
              <label className="block text-xs uppercase text-zinc-400 font-semibold mb-2.5">Yuri Profile Theme Color Presets</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { prim: '#a65cf0', sec: '#0c0e14', label: 'Neon Dusk' },
                  { prim: '#f43f5e', sec: '#111827', label: 'Cyber Rose' },
                  { prim: '#10b981', sec: '#022c22', label: 'Emerald Forest' },
                  { prim: '#f59e0b', sec: '#1e1b4b', label: 'Sunset Glow' },
                  { prim: '#06b6d4', sec: '#0f172a', label: 'Biolume Blue' },
                  { prim: '#d946ef', sec: '#1e1b4b', label: 'Astro Fuchsia' },
                  { prim: '#5865F2', sec: '#0e0e11', label: 'Classic Blurple' },
                ].map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPresetColors(preset.prim, preset.sec, i)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${
                      bannerPresetIndex === i 
                        ? 'bg-purple-600/20 text-purple-400 border-purple-500/40' 
                        : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: preset.prim }}></span>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-zinc-500 font-semibold mb-2">Theme Primary Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={profileThemePrimary} 
                    onChange={(e) => {
                      setProfileThemePrimary(e.target.value);
                      setBannerPresetIndex(-1);
                    }}
                    className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 p-1 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={profileThemePrimary} 
                    onChange={(e) => {
                      setProfileThemePrimary(e.target.value);
                      setBannerPresetIndex(-1);
                    }}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs uppercase font-mono text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase text-zinc-500 font-semibold mb-2">Theme Secondary Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={profileThemeSecondary} 
                    onChange={(e) => {
                      setProfileThemeSecondary(e.target.value);
                      setBannerPresetIndex(-1);
                    }}
                    className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 p-1 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={profileThemeSecondary} 
                    onChange={(e) => {
                      setProfileThemeSecondary(e.target.value);
                      setBannerPresetIndex(-1);
                    }}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs uppercase font-mono text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            {}
            <div className="space-y-3 pt-2">
              <label className="block text-xs uppercase text-zinc-400 font-semibold">Profile Banner Settings</label>
              <div className="flex gap-3">
                {[
                  { id: 'color', label: 'Solid Color' },
                  { id: 'gradient', label: 'Dual Theme Gradient' },
                  { id: 'image', label: 'Custom Image/GIF link' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setBannerType(t.id as any);
                      if (t.id === 'color') setProfileBanner(profileThemePrimary);
                      else if (t.id === 'gradient') setProfileBanner(`linear-gradient(135deg, ${profileThemePrimary} 0%, ${profileThemeSecondary} 100%)`);
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      bannerType === t.id 
                        ? 'bg-purple-600/25 text-purple-300 border-purple-500/50' 
                        : 'bg-black/20 text-zinc-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {bannerType === 'image' && (
                <div className="pt-2">
                  <input 
                    type="text" 
                    value={profileBanner.startsWith('http') || profileBanner.startsWith('data:') ? profileBanner : ''}
                    onChange={(e) => setProfileBanner(e.target.value)}
                    placeholder="Paste image or animated GIF URL..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50 placeholder:text-zinc-700 font-mono text-xs"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">💡 Protip: You can use any static or animated Discord banner link.</span>
                </div>
              )}
            </div>
          </div>

          {}
          <div className="bg-[#10111A]/60 border border-white/10 rounded-2xl p-6 space-y-6">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Award className="w-4 h-4 text-emerald-400" />
              3. Spoiler Badges (Official Spec)
            </h4>

            {}
            <div>
              <label className="block text-xs uppercase text-zinc-500 font-semibold mb-3">Enable Official Discord Badges</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Completed a Quest', val: badgeQuest, set: setBadgeQuest },
                ].map((b, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => b.set(!b.val)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      b.val 
                        ? 'bg-emerald-600/10 text-emerald-300 border-emerald-500/30' 
                        : 'bg-black/30 text-zinc-500 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      b.val ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700 bg-black/40'
                    }`}>
                      {b.val && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <label className="block text-xs uppercase text-zinc-400 font-bold">Custom Badges (Pick Animated Gifs or Static Images)</label>
              <p className="text-xs text-zinc-500">
                Design custom badges. You can upload ANY tiny image icon or dynamic GIF, type a nice custom name tooltip, and add it right to your user row profile.
              </p>

              <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {}
                  <div className="space-y-2">
                    <span className="block text-[11px] text-zinc-500 uppercase font-bold">Icon or Gif File</span>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-black/50 border border-dashed border-white/10 rounded-lg hover:border-indigo-500/40 cursor-pointer text-xs text-zinc-400 transition-all hover:text-white">
                        <Upload className="w-4 h-4 text-zinc-500" />
                        {newBadgeIcon ? 'Image Ready!' : 'Upload file (.png, .gif, .jpg)'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBadgeImageUpload}
                          className="hidden" 
                        />
                      </label>
                      {newBadgeIcon && (
                        <div className="relative w-10 h-10 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center p-1.5 flex-shrink-0 select-none">
                          <img src={newBadgeIcon} alt="Preview" className="w-full h-full object-contain" />
                          <button 
                            onClick={() => setNewBadgeIcon('')}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    {badgeFileError && <p className="text-[10px] text-red-400 font-medium">{badgeFileError}</p>}
                  </div>

                  {}
                  <div className="space-y-2">
                    <span className="block text-[11px] text-zinc-500 uppercase font-bold">Badge Custom Tooltip Title</span>
                    <input 
                      type="text" 
                      value={newBadgeTooltip}
                      onChange={(e) => setNewBadgeTooltip(e.target.value)}
                      placeholder='e.g., "Verified Yuri User"'
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-xs focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                {}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddCustomBadge}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/10"
                  >
                    <Plus className="w-4 h-4" />
                    Inject Badge row
                  </button>
                </div>
              </div>

              {}
              {customBadges.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="block text-xs uppercase text-zinc-500 font-semibold">Active Custom Badges ({customBadges.length})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customBadges.map((badge) => (
                      <div key={badge.id} className="flex items-center justify-between p-2.5 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                            <img src={badge.icon} alt="Badge icon" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <span className="text-xs font-medium text-white block truncate max-w-[150px]">{badge.tooltip}</span>
                            <span className="text-[10px] text-zinc-500 block font-mono">ID: {badge.id}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomBadge(badge.id, badge.tooltip)}
                          className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Applying Cosmetics...' : 'Save Cosmetics & Badges'}
            </button>
          </div>

        </div>

        {}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400 animate-pulse" />
            Live Client-Side Rendering Preview
          </div>

          {}
          <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl relative border border-white/15 text-zinc-100 select-none bg-[#10111A]">
            
            {}
            <div 
              className="h-32 w-full relative transition-all duration-500 bg-cover bg-center"
              style={{ 
                background: bannerType === 'color' 
                  ? profileBanner 
                  : bannerType === 'gradient'
                    ? `linear-gradient(135deg, ${profileThemePrimary} 0%, ${profileThemeSecondary} 100%)` 
                    : `url(${profileBanner})`,
                backgroundColor: profileThemePrimary
              }}
            >
              {nitroType !== 'None' && (
                <div className="absolute top-3 right-3 bg-black/60 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-wide flex items-center gap-1.5 border border-white/10 text-pink-400">
                  <Sparkles className="w-3 h-3 text-pink-400 fill-pink-400/20 animate-spin" style={{ animationDuration: '6s' }} />
                  NITRO ACTIVE
                </div>
              )}
            </div>

            {}
            <div 
              className="px-4 pb-5 pt-3 space-y-4 relative transition-all duration-500"
              style={{
                background: `linear-gradient(180deg, ${profileThemeSecondary}CC 0%, #0e0e11F2 100%)`
              }}
            >
              
              {}
              <div className="flex justify-between items-end -mt-16 relative z-10">
                
                {}
                <div className="relative w-24 h-24 rounded-full bg-[#10111a] flex items-center justify-center p-[4px] shadow-lg group">
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    <img 
                      src={displayAvatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover rounded-full" 
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {}
                  {avatarDecoration !== 'none' && (
                    <div className="absolute inset-0 pointer-events-none select-none">
                      {avatarDecoration === 'cyberpunk' && (
                        <div className="absolute inset-0 rounded-full border-4 border-dashed border-indigo-500/80 animate-spin" style={{ animationDuration: '12s' }}>
                          <span className="absolute -inset-0.5 rounded-full border-2 border-indigo-400/30 animate-pulse bg-indigo-500/10"></span>
                        </div>
                      )}
                      {avatarDecoration === 'fire' && (
                        <div className="absolute inset-0 rounded-full border-4 border-rose-600/70 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse">
                          <span className="absolute inset-0 rounded-full border border-orange-500 animate-ping opacity-25"></span>
                        </div>
                      )}
                      {avatarDecoration === 'sakura' && (
                        <div className="absolute inset-0 rounded-full border-2 border-pink-400/80 shadow-[0_0_10px_rgba(244,114,182,0.3)] animate-spin" style={{ animationDuration: '24s' }}>
                          <span className="absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full bg-pink-300 transform -translate-x-1/2"></span>
                          <span className="absolute bottom-0 left-1/2 w-1.5 h-1.5 rounded-full bg-pink-200 transform -translate-x-1/2"></span>
                        </div>
                      )}
                      {avatarDecoration === 'galaxy' && (
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse">
                          <span className="absolute inset-[-2px] rounded-full border border-blue-500 opacity-60 animate-spin" style={{ animationDuration: '8s' }}></span>
                        </div>
                      )}
                      {avatarDecoration === 'gold_crown' && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter">
                          👑
                        </div>
                      )}
                    </div>
                  )}

                  {}
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#10111a] flex items-center justify-center border-2 border-transparent">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>

                {}
                <div className="flex flex-wrap items-center gap-1.5 max-w-[200px] bg-black/40 border border-white/5 p-1.5 rounded-xl backdrop-blur-xl relative z-10">
                  {}
                  {badgeQuest && (
                    <div className="w-5.5 h-5.5 rounded bg-[#10111A]/60 flex items-center justify-center p-0.5 cursor-help" title="Quest Completed">
                      <img src="https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/quest.svg" className="w-full h-full object-contain" alt="Quest Completed" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {}
                  {nitroType === 'Boost' && (
                    <div className="w-5.5 h-5.5 rounded bg-[#10111A]/60 flex items-center justify-center p-0.5 cursor-help" title="Nitro Subscriber & Server Booster">
                      <img src="https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/nitro-booster.svg" className="w-full h-full object-contain" alt="Nitro Boost" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {(nitroType === 'Basic' || nitroType === 'Classic') && (
                    <div className="w-5.5 h-5.5 rounded bg-[#10111A]/60 flex items-center justify-center p-0.5 cursor-help" title="Classic Subscriber">
                      <img src="https://raw.githubusercontent.com/rhon97/discord-badges/main/assets/nitro.svg" className="w-full h-full object-contain" alt="Nitro Classic" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {}
                  {customBadges.map((badge) => (
                    <div key={badge.id} className="w-5.5 h-5.5 rounded bg-black/35 flex items-center justify-center p-0.5 cursor-help relative group" title={badge.tooltip}>
                      <img src={badge.icon} alt={badge.tooltip} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>

              {}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-extrabold text-white leading-normal">{userDisplayName}</h4>
                  {nitroType !== 'None' && (
                    <span className="bg-pink-500 text-white rounded px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider">
                      STAFF
                    </span>
                  )}
                </div>
                <div className="text-zinc-400 text-xs font-mono">@{usernameClean}</div>
              </div>

              {}
              {(customStatus || customStatusEmoji) && (
                <div className="bg-black/35 rounded-xl p-2.5 border border-white/5 flex items-center gap-2 text-xs">
                  <span className="text-sm flex-shrink-0">{customStatusEmoji}</span>
                  <span className="text-zinc-300 leading-normal font-medium italic truncate">{customStatus}</span>
                </div>
              )}

              {}
              <div className="border-t border-white/5 pt-3 space-y-3">
                {}
                <div className="space-y-1.5">
                  <h5 className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">About Me</h5>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
                    {aboutMe}
                  </p>
                </div>
              </div>

              {}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-xs font-bold text-white rounded-lg"
                >
                  Message User
                </button>
                <button
                  type="button"
                  className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-xs font-bold text-white rounded-lg"
                >
                  Add Friend
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

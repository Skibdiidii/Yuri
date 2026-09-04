import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
  Code,
  Eye,
  Copy,
  Check,
  Download,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  Send,
  Loader2
} from 'lucide-react';

interface BrowserPreviewTabProps {
  onSendMessageToAi?: (prompt: string) => void;
  externalPreviewHtml?: string;
}

export const BrowserPreviewTab: React.FC<BrowserPreviewTabProps> = ({
  onSendMessageToAi,
  externalPreviewHtml
}) => {
  const [url, setUrl] = useState<string>('http://localhost:3000/preview');
  const [inputUrl, setInputUrl] = useState<string>('http://localhost:3000/preview');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'preview' | 'split' | 'code'>('preview');
  const [htmlCode, setHtmlCode] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('Iron & Blade | Craft Barber Lounge');
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [history, setHistory] = useState<string[]>(['http://localhost:3000/preview']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch initial preview site HTML from server
  const fetchCurrentSite = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/preview/current');
      if (res.ok) {
        const data = await res.json();
        if (data.html) {
          setHtmlCode(data.html);
          if (data.title) setPageTitle(data.title);
        }
      }
    } catch (err) {
      console.error('Failed to fetch preview site:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentSite();
  }, []);

  // Sync if externalPreviewHtml is supplied
  useEffect(() => {
    if (externalPreviewHtml && externalPreviewHtml.trim()) {
      setHtmlCode(externalPreviewHtml);
      setUrl('http://localhost:3000/preview');
      setInputUrl('http://localhost:3000/preview');
    }
  }, [externalPreviewHtml]);

  const handleNavigate = (targetUrl: string) => {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl) return;

    if (cleanUrl.toLowerCase().includes('localhost:3000/preview') || cleanUrl === '/preview') {
      cleanUrl = 'http://localhost:3000/preview';
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    setUrl(cleanUrl);
    setInputUrl(cleanUrl);
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(cleanUrl);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setUrl(history[newIdx]);
      setInputUrl(history[newIdx]);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setUrl(history[newIdx]);
      setInputUrl(history[newIdx]);
    }
  };

  const handleReload = () => {
    if (isLocalPreview) {
      fetchCurrentSite();
    } else if (iframeRef.current) {
      iframeRef.current.src = getIframeSrc();
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `${pageTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'website'}.html`;
    a.click();
    URL.revokeObjectURL(u);
  };

  const handleApplyCodeChanges = async (newCode: string) => {
    setHtmlCode(newCode);
    try {
      await fetch('/api/preview/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: newCode, title: pageTitle })
      });
    } catch (e) {
      console.error('Failed to save preview code:', e);
    }
  };

  const handleGenerateAiWebsite = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiPrompt;
    if (!promptToUse.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Build a modern, complete, responsive single-file website for: ${promptToUse}. Include full Tailwind CSS via CDN, Google Fonts, Lucide/FontAwesome icons, rich high-res Unsplash photos, video elements if relevant, and modern interactive sections (hero, features/services, gallery, pricing/booking, testimonials, contact/footer). Wrap your output in <website_preview name="${promptToUse.slice(0, 30)}">...</website_preview>`,
          terminalContext: 'Web builder invoked',
          fileContext: 'public/index.html'
        })
      });

      const data = await res.json();
      if (data.success) {
        await fetchCurrentSite();
        setUrl('http://localhost:3000/preview');
        setInputUrl('http://localhost:3000/preview');
        setViewMode('preview');
      }
    } catch (e) {
      console.error('Error generating AI website:', e);
    } finally {
      setGenerating(false);
      setAiPrompt('');
    }
  };

  const isLocalPreview = url.includes('localhost:3000/preview') || url === '/preview';

  const getIframeSrc = () => {
    if (isLocalPreview) {
      return '/api/preview/site';
    }
    return `/api/browser/frame-proxy?url=${encodeURIComponent(url)}`;
  };

  const presetTopics = [
    { label: '💈 Barber Shop & Lounge', prompt: 'Modern luxury barber shop and grooming lounge with service pricing, cut gallery, and appointment booking' },
    { label: '🏋️ CyberFit Gym', prompt: 'High-intensity athletic gym and fitness center with class schedules, trainer profiles, and membership tiers' },
    { label: '☕ Artisan Coffee Roasters', prompt: 'Specialty third-wave coffee house and artisan bakery with single-origin menu and bean subscriptions' },
    { label: '⚡ Apex Cloud SaaS', prompt: 'Next-gen developer cloud observability platform with live metrics mockup, interactive pricing table, and feature bento grid' },
    { label: '🍣 Omakase Bistro', prompt: 'Fine-dining Japanese sushi bar and lounge with seasonal tasting menu, wine pairings, and reservation form' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#121216] text-zinc-200 overflow-hidden select-none font-sans">
      {/* Top Browser & Preview Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#18181f] border-b border-white/10 gap-2 text-xs">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Back"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Forward"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={handleReload}
            className={`p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ${loading ? 'animate-spin text-amber-400' : ''}`}
            title="Reload Preview"
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* Address & URL Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 max-w-xl flex items-center bg-[#111116] border border-white/10 hover:border-white/20 focus-within:border-amber-500/60 rounded-full px-3 py-1 transition-all"
        >
          <Lock size={12} className="text-emerald-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Search web or enter URL (e.g. localhost:3000/preview)..."
            className="w-full bg-transparent text-zinc-200 placeholder-zinc-500 focus:outline-none text-xs font-mono"
          />
          {isLocalPreview && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
              LIVE PREVIEW
            </span>
          )}
        </form>

        {/* Viewport Device Switcher */}
        <div className="hidden sm:flex items-center bg-[#111116] p-0.5 rounded-lg border border-white/10 gap-0.5">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`p-1.5 rounded ${deviceMode === 'desktop' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Desktop View (100%)"
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`p-1.5 rounded ${deviceMode === 'tablet' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Tablet View (768px)"
          >
            <Tablet size={14} />
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`p-1.5 rounded ${deviceMode === 'mobile' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Mobile View (375px)"
          >
            <Smartphone size={14} />
          </button>
        </div>

        {/* View Mode (Preview / Split / Code) */}
        <div className="flex items-center bg-[#111116] p-0.5 rounded-lg border border-white/10 gap-0.5">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2 py-1 rounded flex items-center gap-1.5 text-xs font-medium ${viewMode === 'preview' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Eye size={13} />
            <span className="hidden md:inline">Preview</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 rounded flex items-center gap-1.5 text-xs font-medium ${viewMode === 'split' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Layers size={13} />
            <span className="hidden md:inline">Split</span>
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`px-2 py-1 rounded flex items-center gap-1.5 text-xs font-medium ${viewMode === 'code' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Code size={13} />
            <span className="hidden md:inline">Code</span>
          </button>
        </div>

        {/* External Link & Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.open(isLocalPreview ? '/api/preview/site' : url, '_blank')}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* AI Website Generator Quick Action Bar */}
      <div className="bg-[#15151c] border-b border-white/5 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 text-amber-400 font-semibold text-xs whitespace-nowrap">
            <Sparkles size={14} />
            <span>AI Web Builder:</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            {presetTopics.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleGenerateAiWebsite(preset.prompt)}
                disabled={generating}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 whitespace-nowrap transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateAiWebsite();
          }}
          className="flex items-center gap-2 w-full sm:w-80"
        >
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Prompt a website with images & videos..."
            disabled={generating}
            className="flex-1 bg-[#0e0e13] border border-white/10 rounded-lg px-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="submit"
            disabled={generating || !aiPrompt.trim()}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Building...</span>
              </>
            ) : (
              <>
                <Send size={11} />
                <span>Build</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Main Content Area (Preview, Split, or Code) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Code Editor Panel (shown in 'split' or 'code' mode) */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={`flex flex-col border-r border-white/10 bg-[#0d0d11] ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="flex items-center justify-between px-4 py-2 bg-[#14141a] border-b border-white/5 text-xs text-zinc-400">
              <span className="font-mono text-[11px] text-zinc-300 flex items-center gap-1.5">
                <Code size={13} className="text-amber-400" />
                index.html
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                  title="Copy Full HTML"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                  title="Download HTML File"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
              </div>
            </div>
            <div className="flex-1 p-3 overflow-auto">
              <textarea
                value={htmlCode}
                onChange={(e) => handleApplyCodeChanges(e.target.value)}
                className="w-full h-full bg-transparent text-zinc-300 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-amber-500/30"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Live Preview Panel (shown in 'preview' or 'split' mode) */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-auto bg-[#0a0a0d] ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div
              className={`transition-all duration-300 flex flex-col shadow-2xl overflow-hidden ${
                deviceMode === 'desktop'
                  ? 'w-full h-full rounded-lg border border-white/10'
                  : deviceMode === 'tablet'
                  ? 'w-[768px] h-[95%] rounded-3xl border-8 border-zinc-800 ring-1 ring-white/10 my-auto'
                  : 'w-[375px] h-[95%] rounded-[40px] border-[10px] border-zinc-800 ring-1 ring-white/10 my-auto'
              }`}
            >
              {/* Phone Speaker Notch simulation for Mobile mode */}
              {deviceMode === 'mobile' && (
                <div className="bg-zinc-800 h-6 w-full flex items-center justify-center">
                  <div className="w-16 h-3 bg-zinc-950 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 mr-2"></div>
                  </div>
                </div>
              )}

              {/* Tablet Header Bar simulation */}
              {deviceMode === 'tablet' && (
                <div className="bg-zinc-800 h-4 w-full flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-950"></div>
                </div>
              )}

              {/* The Iframe */}
              <div className="flex-1 w-full h-full bg-white overflow-hidden relative">
                {isLocalPreview ? (
                  <iframe
                    ref={iframeRef}
                    title="Website Preview"
                    srcDoc={htmlCode}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
                  />
                ) : (
                  <iframe
                    ref={iframeRef}
                    title="Browser Frame"
                    src={getIframeSrc()}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

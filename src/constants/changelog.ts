export interface ChangelogEntry {
  version: string;
  date: string;
  features: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v1.4.1",
    date: "2026-10-03",
    features: [
      "Live Discord Account Session Guard with real-time remote session detection",
      "Instant 1-Click Discord App Kick: Log out remote phones, tablets, and desktop apps directly from Discord servers",
      "Auto-Kick Untrusted Discord Logins: Automatically terminates unrecognized logins in milliseconds",
      "Emergency Global Discord Logout: Revokes all external sessions and invalidates unauthorized access tokens",
      "Multi-User Security Profile Isolation: Personalized protection, trusted devices, and recovery keys for every account"
    ]
  },
  {
    version: "v1.4.0",
    date: "2026-10-03",
    features: [
      "Owner Security & Session Protection System with cryptographic verification challenges",
      "Unauthorized session detection with real-time pending login alerts and device authorization",
      "Multi-platform Web Push notifications for immediate new device recognition across all OS",
      "Trusted session inventory with individual and emergency one-click revoke all other sessions",
      "Immutable security activity audit log recording all login, approval, and verification events"
    ]
  },
  {
    version: "v1.3.2",
    date: "2026-09-11",
    features: [
      "Interactive Linux PTY Terminal with real-time xterm streaming",
      "High-Performance Gateway & Companion Service optimizations"
    ]
  },
  {
    version: "v1.3.1",
    date: "2026-09-10",
    features: [
      "Cloud Node & Virtualization Protocol Optimization",
      "Advanced Tunnel Gateway Reliability with auto-reconnection",
      "Multi-Layered Interface Polish and real-time terminal telemetry monitoring"
    ]
  },
  {
    version: "v1.3.0",
    date: "2026-09-05",
    features: [
      "High-Performance Session Synchronization pipeline refactoring",
      "Workspace multi-environment state hardening and token verification",
      "Refined ultra HD visuals, glassmorphic UI layout, and 60 FPS motion physics",
      "Enhanced system diagnostic logging and telemetry metrics aggregation"
    ]
  },
  {
    version: "v1.2.9",
    date: "2026-09-04",
    features: [
      "Transparent Glass Minimalist Architecture across all components",
      "Lightened Ultra HD Visual Background with enhanced dynamic contrast",
      "Optimized High-Framerate Scroll Physics with GPU acceleration"
    ]
  },
  {
    version: "v1.02",
    date: "2026-03-22",
    features: [
      "Enhanced Alt Token management with mass import and status tracking",
      "Advanced RPC Customizer with direct image uploads and CDN support",
      "Integrated 'Revenge' tab for automated user termination and violation scraping",
      "Memory management optimizations with automatic cache sweeping",
      "Added system monitoring for real-time memory and selfbot status",
      "Implemented keep-alive mechanism to prevent container idling",
      "Improved Discord client spoofing for better anti-detection",
      "Added manual garbage collection support for long-running sessions"
    ]
  },
  {
    version: "v1.01",
    date: "2026-03-14",
    features: [
      "Added SoundBoard feature on VC with spam toggle and interval control",
      "Added .spamsb <count> [interval] command for mass soundboard spamming",
      "Added SoundBoard test audio functionality in the dashboard",
      "Integrated Advanced Neural TTS (Text-to-Speech) for Voice Channels",
      "Fixed camera/video functionality on VC for better stability",
      "Added Voice category to the .help menu (Category 7)",
      "Added .leavevc command to quickly disconnect from all voice channels",
      "Updated UI components for better responsiveness and clarity"
    ]
  },
  {
    version: "v1.0.0",
    date: "2026-03-11",
    features: [
      "Initial stable Yuri",
      "Fixed VC Screenshare (Go Live) functionality",
      "Added Status Rotator with custom intervals",
      "Added Alt Token Importer for mass control",
      "Added RPC (Rich Presence) customizer",
      "Added Changelog system",
      "Improved UI with dark fantasy theme",
      "Added 24/7 Video/YouTube/Image streaming to VC",
      "Optimized stream monitor for better stability"
    ]
  }
];

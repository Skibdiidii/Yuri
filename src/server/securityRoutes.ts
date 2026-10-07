import { Router, Request, Response, NextFunction } from 'express';
import { securityManager } from './securityManager';
import crypto from 'crypto';

const router = Router();

export function securityEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  next();
}

router.get('/status', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const status = securityManager.getStatus(token);
  res.json({ success: true, ...status });
});

router.get('/events', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || (req.query.token as string) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const accountKey = token ? securityManager.resolveAccountKey(token) : undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  securityManager.addSseClient(res, accountKey);

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    securityManager.removeSseClient(res);
  });
});

router.get('/discord/sessions', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const remoteSessions = await securityManager.fetchDiscordRemoteSessions(token);
    res.json({ success: true, sessions: remoteSessions });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch Discord remote sessions' });
  }
});

router.post('/discord/kick-session', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { sessionIdHash } = req.body;

  if (!token || !sessionIdHash) {
    return res.status(400).json({ error: 'Token and session ID hash are required' });
  }

  try {
    const success = await securityManager.kickDiscordRemoteSession(token, sessionIdHash);
    res.json({ success });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to kick Discord session' });
  }
});

router.post('/discord/kick-all', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const kickedCount = await securityManager.emergencyKickAllDiscordSessions(token);
    res.json({ success: true, kickedCount });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to kick all Discord sessions' });
  }
});

router.get('/sessions', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const status = securityManager.getStatus(token);
  const sessions = [...status.trustedSessions, ...status.pendingSessions, ...status.revokedSessions];
  res.json({ success: true, sessions });
});

router.post('/sessions/approve', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const success = securityManager.approveSession(sessionId);
  res.json({ success });
});

router.post('/sessions/reject', async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const success = await securityManager.rejectSession(sessionId);
  res.json({ success });
});

router.post('/sessions/revoke', async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const success = await securityManager.revokeSession(sessionId);
  res.json({ success });
});

router.get('/audit', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const logs = securityManager.getStatus(token).auditLogs;
  res.json({ success: true, logs });
});

router.post('/settings', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const updates = req.body;
  const accountKey = securityManager.resolveAccountKey(token);
  const settings = securityManager.updateAccountConfig(accountKey, updates);
  res.json({ success: true, settings });
});

router.post('/ip/block', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { ip, reason } = req.body;
  const accountKey = securityManager.resolveAccountKey(token);
  securityManager.blockIp(ip, accountKey, reason);
  res.json({ success: true });
});

router.post('/ip/unblock', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { ip } = req.body;
  securityManager.unblockIp(ip, token);
  res.json({ success: true });
});

export default router;

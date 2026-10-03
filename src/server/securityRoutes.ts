import { Router, Request, Response } from 'express';
import { securityManager } from './securityManager';
import crypto from 'crypto';

const router = Router();

router.get('/status', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const status = securityManager.getStatus(token);
  res.json({ success: true, ...status });
});

router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  securityManager.addSseClient(res);

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

router.get('/check-session', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const session = securityManager.getSessionByToken(token);
  if (!session) {
    const registered = securityManager.registerSession(token, req);
    return res.json({
      success: true,
      session: registered.session,
      isTrusted: registered.session.trusted,
      isPending: registered.session.status === 'PENDING',
    });
  }

  return res.json({
    success: true,
    session,
    isTrusted: session.status === 'TRUSTED',
    isPending: session.status === 'PENDING',
    isRevoked: session.status === 'REVOKED' || session.status === 'REJECTED',
  });
});

router.post('/challenge/create', (req: Request, res: Response) => {
  const { action, sessionId } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  const challenge = securityManager.createChallenge(action, sessionId);
  res.json({
    success: true,
    challengeId: challenge.challengeId,
    challengeData: challenge.challengeData,
    expiresAt: challenge.expiresAt,
    supportedMethods: ['passkey', 'recovery_code', 'owner_secret'],
  });
});

router.post('/challenge/verify', (req: Request, res: Response) => {
  const { challengeId, method, authPayload } = req.body;
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

  if (!challengeId || !method || authPayload === undefined) {
    return res.status(400).json({ error: 'Missing required challenge parameters' });
  }

  const challenge = securityManager.getChallenge(challengeId);
  if (!challenge) {
    return res.status(400).json({ error: 'Challenge expired or invalid. Please request a new one.' });
  }

  if (Date.now() > challenge.expiresAt) {
    securityManager.deleteChallenge(challengeId);
    return res.status(400).json({ error: 'Verification challenge has expired.' });
  }

  const isValid = securityManager.verifyOwnerAuth(method, authPayload, ip);
  if (!isValid) {
    securityManager.addAuditLog(
      'FAILED_VERIFICATION',
      `Failed owner verification attempt using ${method}`,
      challenge.targetSessionId,
      undefined,
      ip
    );
    return res.status(403).json({
      error: 'Authentication failed. Invalid passkey, recovery code, or secret.',
      locked: false,
    });
  }

  securityManager.addAuditLog(
    'VERIFICATION_ATTEMPT',
    `Successful owner verification via ${method}`,
    challenge.targetSessionId,
    undefined,
    ip
  );

  let actionResult: any = { executed: true };
  if (challenge.action === 'ACCEPT' && challenge.targetSessionId) {
    securityManager.approveSession(challenge.targetSessionId, `Owner Verification (${method})`);
    actionResult.approvedSessionId = challenge.targetSessionId;
  } else if (challenge.action === 'REJECT' && challenge.targetSessionId) {
    securityManager.rejectSession(challenge.targetSessionId, `Rejected via Owner Verification (${method})`);
    actionResult.rejectedSessionId = challenge.targetSessionId;
  } else if (challenge.action === 'REVOKE_SESSION' && challenge.targetSessionId) {
    securityManager.revokeSession(challenge.targetSessionId, `Revoked via Owner Verification (${method})`);
    actionResult.revokedSessionId = challenge.targetSessionId;
  } else if (challenge.action === 'REVOKE_ALL') {
    const count = securityManager.emergencyRevokeAll(challenge.targetSessionId, ip);
    actionResult.revokedCount = count;
  }

  securityManager.deleteChallenge(challengeId);
  res.json({
    success: true,
    message: 'Owner verification successful and action executed.',
    action: challenge.action,
    result: actionResult,
  });
});

router.post('/approve', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  const ok = securityManager.approveSession(sessionId, 'Security Dashboard Direct Approval');
  if (!ok) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ success: true, message: `Session ${sessionId} approved and trusted.` });
});

router.post('/reject', (req: Request, res: Response) => {
  const { sessionId, reason } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  const ok = securityManager.rejectSession(sessionId, reason || 'Rejected by Owner');
  if (!ok) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ success: true, message: `Session ${sessionId} rejected.` });
});

router.post('/revoke', (req: Request, res: Response) => {
  const { sessionId, reason } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  const ok = securityManager.revokeSession(sessionId, reason || 'Revoked by Owner');
  if (!ok) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ success: true, message: `Session ${sessionId} revoked.` });
});

router.post('/emergency-revoke-all', (req: Request, res: Response) => {
  const { currentSessionId } = req.body;
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  const count = securityManager.emergencyRevokeAll(currentSessionId, ip);
  res.json({
    success: true,
    revokedCount: count,
    message: `Emergency action completed: ${count} sessions were immediately revoked.`,
  });
});

router.post('/push-subscribe', (req: Request, res: Response) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid push subscription payload' });
  }
  const id = `PUSH-${crypto.createHash('md5').update(subscription.endpoint).digest('hex').substring(0, 8)}`;
  securityManager.addPushSubscription({
    id,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    createdAt: Date.now(),
    userAgent: req.headers['user-agent'] || 'Unknown',
  });
  res.json({ success: true, subscriptionId: id });
});

router.post('/test-push', (req: Request, res: Response) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Chrome / Android (Test)';
  const { device } = securityManager.parseUserAgent(userAgent);
  const location = securityManager.resolveLocation(req);

  const testSession = {
    sessionId: `SEC-TEST-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    tokenHash: 'test',
    device,
    os: 'Android',
    browser: 'Chrome',
    location,
    detectedAt: Date.now(),
    lastActiveAt: Date.now(),
    status: 'PENDING' as const,
    trusted: false,
    approvalRequired: true,
    ip,
    userAgent,
  };

  securityManager.dispatchLoginNotification(testSession);
  res.json({ success: true, message: 'Test login notification dispatched successfully.' });
});

export default router;

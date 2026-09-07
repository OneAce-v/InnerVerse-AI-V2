import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  // Test-suite-only bypass: lets integration tests authenticate as an arbitrary user
  // without a real Firebase ID token. Gated on NODE_ENV, which production deployments
  // never set to 'test' (the app itself requires NODE_ENV=production to serve its
  // static build - see the app.use(express.static(...)) branch below in server.ts).
  if (process.env.NODE_ENV === 'test' && token.startsWith('TEST_AUTH:')) {
    const uid = token.slice('TEST_AUTH:'.length);
    req.user = { uid, email: `${uid}@test.local`, name: 'Test User' } as unknown as DecodedIdToken;
    next();
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};

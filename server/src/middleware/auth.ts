import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request { user?: { id: string; email: string } }

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

import { Admin } from '../models/Admin';

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  // Ensure authenticated first
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const email = req.user.email?.toLowerCase();
    if (!email) return res.status(403).json({ message: 'Forbidden' });
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

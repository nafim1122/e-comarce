import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
// jsonwebtoken ESM default export; named exports may not be provided in ESM context
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { env } from '../config/env';

export async function seedAdminIfNeeded() {
  const existing = await Admin.findOne({ email: env.ADMIN_EMAIL });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10);
    await Admin.create({ email: env.ADMIN_EMAIL, passwordHash: hash });
    console.log('Seeded default admin:', env.ADMIN_EMAIL, 'password: admin123');
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const payload: JwtPayload = { id: admin._id.toString(), email: admin.email };
  // Convert simple time expressions (e.g., 1d, 12h, 30m, 45s) to seconds number for strict typing.
  const expiresRaw = env.JWT_EXPIRES;
  const expiresInSeconds = (() => {
    const m = /^([0-9]+)([smhd])$/.exec(expiresRaw);
    if (!m) return 24 * 60 * 60; // default 1 day
    const val = Number(m[1]);
    const unit = m[2];
    switch (unit) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 24 * 60 * 60;
    }
  })();
  const token = jwt.sign(payload, env.JWT_SECRET as string, { expiresIn: expiresInSeconds });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false });
  return res.json({ token, email: admin.email });
}

export function logout(req: Request, res: Response) {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
}

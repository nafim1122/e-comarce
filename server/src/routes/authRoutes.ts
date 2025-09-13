import { Router } from 'express';
import { login, logout } from '../controllers/authController';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, (req, res) => {
	const user = (req as AuthRequest).user;
	res.json({ user });
});

export default router;

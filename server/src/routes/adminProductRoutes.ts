import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { editProductController } from '../controllers/productController';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join(process.cwd(), 'server', 'uploads'));
  },
  filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// Admin-only product patch/update endpoint
router.put('/products/:id', requireAuth, requireAdmin, upload.single('photo'), asyncHandler(editProductController));

export default router;

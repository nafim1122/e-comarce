import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { listProducts, addProductController, deleteProductController, editProductController } from '../controllers/productController';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, path.join(process.cwd(), 'server', 'uploads'));
  },
  filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
    cb(null, true);
  }
});

router.get('/list', asyncHandler(listProducts));
router.post('/add', requireAuth, upload.single('photo'), asyncHandler(addProductController));
router.delete('/delete/:id', requireAuth, asyncHandler(deleteProductController));
router.put('/edit/:id', requireAuth, upload.single('photo'), asyncHandler(editProductController));

export default router;

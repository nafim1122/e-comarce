import { Router } from 'express';
import { addToCartController, listCartController, deleteCartItemController, mergeCartController } from '../controllers/cartController';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Require authentication so cart items are associated with a userId on the server.
router.post('/add', requireAuth, asyncHandler(addToCartController));
router.get('/list', requireAuth, asyncHandler(listCartController));
router.delete('/delete/:id', requireAuth, asyncHandler(deleteCartItemController));
router.post('/merge', requireAuth, asyncHandler(mergeCartController));

export default router;

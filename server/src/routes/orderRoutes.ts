import { Router } from 'express';
import { createOrderController, listOrdersController, deleteOrderController, updateOrderStatusController } from '../controllers/orderController';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/create', requireAuth, asyncHandler(createOrderController));
router.get('/list', requireAdmin, asyncHandler(listOrdersController));
router.delete('/delete/:id', requireAdmin, asyncHandler(deleteOrderController));
router.put('/status/:id', requireAdmin, asyncHandler(updateOrderStatusController));

export default router;

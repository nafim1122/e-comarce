import { Request, Response, NextFunction } from 'express';

// Wrap async route handlers to forward errors to the centralized handler
type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
export const asyncHandler = (fn: AsyncRoute) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not-found handler (attach after routes)
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found' });
}

// Central error handler
interface AppError extends Error { status?: number }
export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const status = (err.status && Number.isInteger(err.status)) ? err.status : 500;
  const payload: { message: string; stack?: string } = {
    message: err.message || 'Internal server error'
  };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}

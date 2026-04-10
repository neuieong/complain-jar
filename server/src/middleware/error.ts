import type { Request, Response, NextFunction } from 'express'

// Catches any error thrown from async route handlers (via next(err) or
// unhandled promise rejections in Express 5+). Hides internal details in
// production so stack traces never reach the client.
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err)
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}

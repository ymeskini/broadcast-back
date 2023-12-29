import { ErrorRequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { errors as JoseErrors } from 'jose';

import { AppError } from '../../lib/AppError.js';
import { __DEV__ } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';

const sendErrorDev = (err: AppError, res: Response) => {
  logger.info(err);
  res.status(err.statusCode).json({
    message: err.message,
    stack: err.stack,
    error: err,
    status: err.statusCode,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      message: err.message,
      status: err.statusCode,
    });
  } else {
    // don't leak the error to the client
    logger.error(err);
    res.status(500).json({
      message: 'Something went wrong',
      status: 500,
    });
  }
};

export const globalErrorHandler =
  (): ErrorRequestHandler =>
  // don't remove _next in parameters otherwise the middleware won't work
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err, _, res, _next) => {
    err.statusCode = err.statusCode || 500;
    const error = { ...err };

    if (err instanceof JoseErrors.JOSEError) {
      error.statusCode = 401;
      error.isOperational = true;
    }

    if (err instanceof ZodError) {
      error.statusCode = 400;
      error.isOperational = true;
    }

    if (__DEV__) {
      sendErrorDev(error, res);
    } else {
      sendErrorProd(error, res);
    }
  };

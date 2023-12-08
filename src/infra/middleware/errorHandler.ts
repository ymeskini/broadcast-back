import { ErrorRequestHandler, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { ZodError } from 'zod';
import { errors } from 'jose';

import { AppError } from '../../lib/AppError.js';
import { __DEV__ } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';

const sendErrorDev = (err: AppError, res: Response) => {
  logger.info(err);
  res.status(err.statusCode).json({
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      error: STATUS_CODES[err.statusCode],
    });
  } else {
    // don't leak the error to the client
    logger.error(err);
    res.status(500).json({
      statusCode: 500,
      message: STATUS_CODES[500],
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

    if (err instanceof errors.JOSEError) {
      error.statusCode = 401;
      error.isOperational = true;
    }

    if (err instanceof ZodError) {
      error.statusCode = 400;
      error.isOperational = true;
      logger.info(err.issues);
    }

    if (__DEV__) {
      sendErrorDev(error, res);
    } else {
      sendErrorProd(error, res);
    }
  };

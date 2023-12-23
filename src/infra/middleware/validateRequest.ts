import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ParsedQs } from 'qs';

export const validateRequest =
  <
    TParams extends Record<string, any>,
    TBody extends Record<string, any>,
    TQuery extends ParsedQs,
  >(
    config: {
      query?: z.Schema<TQuery>;
      body?: z.Schema<TBody>;
      params?: z.Schema<TParams>;
    },
    handler: (
      req: Request<TParams, any, TBody, TQuery>,
      res: Response<any>,
      next: NextFunction,
    ) => void,
  ): ((
    req: Request<TParams, any, TBody, TQuery>,
    res: Response,
    next: NextFunction,
  ) => void) =>
  (req, res, next) => {
    const { query, body, params } = req;

    config?.query?.parse(query);
    config?.body?.parse(body);
    config?.params?.parse(params);

    return handler(req, res, next);
  };

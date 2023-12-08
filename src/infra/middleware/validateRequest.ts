import { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { ParsedQs } from 'qs';

export const validateRequest = <
  TQuery extends ParsedQs = any,
  TBody extends Record<string, any> = any,
  TParams extends Record<string, any> = any,
  TResponse = any,
>(
  config: {
    query?: z.Schema<TQuery>;
    body?: z.Schema<TBody>;
    params?: z.Schema<TParams>;
    response?: z.Schema<TResponse>;
  },
  handler: (
    req: Request<TParams, TResponse, TBody, TQuery>,
    res: Response<TResponse>,
    next: NextFunction,
  ) => any,
): RequestHandler<TParams, TResponse, TBody, TQuery> => {
  return (req, res, next) => {
    const { query, body, params } = req;

    config?.query?.parse(query);
    config?.body?.parse(body);
    config?.params?.parse(params);

    return handler(req, res, next);
  };
};

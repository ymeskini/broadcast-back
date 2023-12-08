import { Request, RequestHandler } from 'express';
import { RedisRepository } from '../redis.repository.js';

export const cacheResponse =
  (
    redisRepository: RedisRepository,
    keyExtractor: (req: Request) => string,
    ttl = 10,
  ): RequestHandler =>
  async (req, res, next) => {
    const redisKey = redisRepository.keyGenerator(keyExtractor(req));
    const cachedValue = await redisRepository.getJson(redisKey);

    if (cachedValue) {
      return res.json(cachedValue);
    } else {
      const originalJson = res.json;
      res.json = (body) => {
        res.once('finish', async () => {
          await redisRepository.setJson(redisKey, ttl, body);
        });
        return originalJson.call(res, body);
      };
    }

    return next();
  };

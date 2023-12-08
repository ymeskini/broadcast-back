import { RedisClientType } from './modules/redis.js';

export class RedisRepository {
  constructor(private readonly redis: RedisClientType) {}

  setJson = async (key: string, ttl: number, body: object): Promise<void> => {
    await this.redis.set(key, JSON.stringify(body), {
      EX: ttl,
    });
  };

  getJson = async <T>(key: string): Promise<T | null> => {
    const cachedValue = await this.redis.get(key);
    if (cachedValue) {
      return JSON.parse(cachedValue) as T;
    }
    return null;
  };

  keyGenerator = (key: string): string => {
    return `app:${key}`;
  };
}

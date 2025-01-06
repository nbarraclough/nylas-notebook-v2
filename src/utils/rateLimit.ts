const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 10; // Max requests per window

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitStore[identifier];

  if (!record || now > record.resetTime) {
    rateLimitStore[identifier] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
};
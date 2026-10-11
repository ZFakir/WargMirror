const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const rateLimitError = { error: 'Too many requests, try again later.' };

function createRateLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    keyGenerator: (req) => {
      const userId = req.user?.user_id;
      return userId ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip)}`;
    },
    handler: (req, res) => res.status(429).json(rateLimitError)
  });
}

const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 20 });
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, limit: 60 });

module.exports = { authLimiter, createRateLimiter, writeLimiter };

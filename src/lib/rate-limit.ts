import 'server-only';

// In-memory rate limiting with automatic expired-entry pruning.
// No external Redis or Upstash required.
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class MemoryLimiter {
  private windowMap = new Map<string, { count: number; expiresAt: number }>();
  private lastCleanup = Date.now();

  private cleanup(now: number) {
    // Prune expired entries every 5 minutes
    if (now - this.lastCleanup > 300_000) {
      this.lastCleanup = now;
      for (const [key, entry] of this.windowMap.entries()) {
        if (entry.expiresAt <= now) {
          this.windowMap.delete(key);
        }
      }
    }
  }

  async limit(identifier: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.cleanup(now);

    const entry = this.windowMap.get(identifier);

    if (!entry || entry.expiresAt <= now) {
      this.windowMap.set(identifier, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowSeconds * 1000,
      };
    }

    if (entry.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: entry.expiresAt,
      };
    }

    entry.count += 1;
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: entry.expiresAt,
    };
  }
}

const memoryLimiter = new MemoryLimiter();

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return memoryLimiter.limit(key, maxRequests, windowSeconds);
}

// Preset rate limiters according to spec §7.1
export const RateLimits = {
  // Register: 5/hour per IP
  register: (ip: string) => checkRateLimit(`reg:${ip}`, 5, 3600),
  // Login: 10 per 15 min per IP+email
  login: (ip: string, email: string) => checkRateLimit(`login:${ip}:${email.toLowerCase()}`, 10, 900),
  // Forgot password: 3/hour per email, 10/hour per IP
  forgotPasswordEmail: (email: string) => checkRateLimit(`fp:email:${email.toLowerCase()}`, 3, 3600),
  forgotPasswordIp: (ip: string) => checkRateLimit(`fp:ip:${ip}`, 10, 3600),
  // Download: 30/min per user
  download: (userId: string) => checkRateLimit(`dl:${userId}`, 30, 60),
  // Import: 20/hour per admin
  importAction: (adminId: string) => checkRateLimit(`imp:${adminId}`, 20, 3600),
};

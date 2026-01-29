import * as jwt from 'jsonwebtoken';

interface SupabaseJwtPayload {
  sub: string;
  email: string;
  email_confirmed: boolean;
  role: string;
  aud: string;
  exp: number;
  iat: number;
  app_metadata?: {
    provider: string;
  };
  user_metadata?: {
    display_name?: string;
  };
}

/**
 * Generate a test JWT token for E2E testing.
 * Uses the SUPABASE_JWT_SECRET environment variable.
 */
export function generateTestJwt(
  userId: string = 'test-user-id',
  email: string = 'test@example.com',
  displayName: string = 'Test User',
): string {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    throw new Error(
      'SUPABASE_JWT_SECRET environment variable is required for E2E tests',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: SupabaseJwtPayload = {
    sub: userId,
    email: email,
    email_confirmed: true,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
    app_metadata: {
      provider: 'email',
    },
    user_metadata: {
      display_name: displayName,
    },
  };

  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

/**
 * Generate a unique test user for each test to avoid conflicts.
 */
export function generateUniqueTestUser(): {
  userId: string;
  email: string;
  displayName: string;
  token: string;
} {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const userId = `test-user-${uniqueId}`;
  const email = `test-${uniqueId}@example.com`;
  const displayName = `Test User ${uniqueId}`;
  const token = generateTestJwt(userId, email, displayName);

  return { userId, email, displayName, token };
}

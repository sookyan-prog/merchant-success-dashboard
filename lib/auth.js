import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'ms_session';
const SESSION_DAYS = 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set - add it in Vercel > Environment Variables.');
  }
  return new TextEncoder().encode(secret);
}

/* One JWT per signed-in person, holding just enough to identify them - id,
   email, display name and role. Nothing sensitive (never the password
   hash) goes in the token, since it's readable by the browser holding the
   cookie even though it can't be forged without the secret. */
export async function signSession(user) {
  return await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch (e) {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

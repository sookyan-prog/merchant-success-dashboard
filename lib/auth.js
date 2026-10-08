import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';

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

/* A valid signature is not enough on its own: a session cookie stays valid for
   30 days, so someone whose login has been removed (a leaver) would keep full
   access until it expired. After the signature checks out, confirm the account
   still exists. The answer is remembered briefly so this is not a database
   hit on every request. If the database cannot be reached the check is
   skipped rather than locking everybody out. */
const _alive = new Map(); // user id -> { ok, at }
const ALIVE_TTL_MS = 60 * 1000;
async function accountStillExists(id) {
  if (!id) return true;
  const hit = _alive.get(id);
  if (hit && Date.now() - hit.at < ALIVE_TTL_MS) return hit.ok;
  try {
    const { rows } = await db().query('select 1 from users where id = $1', [id]);
    const ok = rows.length > 0;
    _alive.set(id, { ok, at: Date.now() });
    return ok;
  } catch (e) {
    return true;
  }
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!(await accountStillExists(payload.sub))) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

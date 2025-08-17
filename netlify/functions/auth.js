import { neon } from '@netlify/neon';
import { createHash, randomBytes, webcrypto } from 'node:crypto';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

const sql = neon(); // uses NETLIFY_DATABASE_URL

// ======= Config (env) =======
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = 'pa_session';
const IS_PROD = process.env.NODE_ENV === 'production';

export const emailSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200)
});

// ======= Users =======
export async function findUserByEmail(email) {
  const rows = await sql`select * from users where email = ${email} limit 1`;
  return rows[0] || null;
}
export async function findUserByProvider(provider, provider_id) {
  const rows = await sql`
    select * from users where provider = ${provider} and provider_id = ${provider_id} limit 1`;
  return rows[0] || null;
}
export async function createLocalUser(email, password, name=null) {
  const password_hash = await argon2.hash(password, { type: argon2.argon2id });
  const rows = await sql`
    insert into users (email, name, password_hash, provider)
    values (${email}, ${name}, ${password_hash}, 'local')
    returning *`;
  return rows[0];
}
export async function upsertOAuthUser({ provider, provider_id, email, name }) {
  const existing = await findUserByProvider(provider, provider_id);
  if (existing) return existing;
  const rows = await sql`
    insert into users (email, name, provider, provider_id)
    values (${email}, ${name}, ${provider}, ${provider_id})
    on conflict (email) do update set
      name = excluded.name,
      updated_at = now()
    returning *`;
  return rows[0];
}

// ======= Sessions (JWT in httpOnly cookie) =======
export async function issueSession(user) {
  const token = await new SignJWT({
    uid: user.id, email: user.email, provider: user.provider
  })
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuedAt()
  .setExpirationTime('7d')
  .sign(JWT_SECRET);
  return token;
}
export async function readSession(req) {
  const cookie = parseCookie(req.headers.cookie || '')[COOKIE_NAME];
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, JWT_SECRET);
    return payload; // { uid, email, provider, iat, exp }
  } catch { return null; }
}
export function sessionCookie(token) {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    IS_PROD ? `Secure` : null,
    `Max-Age=${60*60*24*7}`
  ].filter(Boolean).join('; ');
  return attrs;
}
export function clearSessionCookie() {
  const attrs = [
    `${COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    IS_PROD ? `Secure` : null,
    `Max-Age=0`
  ].filter(Boolean).join('; ');
  return attrs;
}
function parseCookie(str){
  return Object.fromEntries((str || '').split(/; */).map(kv=>{
    const idx = kv.indexOf('=');
    if (idx < 0) return [kv.trim(), ''];
    return [kv.slice(0,idx).trim(), decodeURIComponent(kv.slice(idx+1))];
  }));
}

// ======= PKCE Helpers for OAuth (Google) =======
export async function pkcePair() {
  const code_verifier = base64url(randomBytes(32));
  const enc = new TextEncoder();
  const digest = await webcrypto.subtle.digest(
    'SHA-256', enc.encode(code_verifier)
  );
  const code_challenge = base64url(Buffer.from(digest));
  return { code_verifier, code_challenge };
}
function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}


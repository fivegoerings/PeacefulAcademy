// Shared auth utilities: DB access, hashing, JWT cookies, PKCE helpers
import { neon } from '@netlify/neon';
import argon2 from 'argon2';
import { z } from 'zod';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { randomBytes, webcrypto } from 'node:crypto';

const sql = neon(); // uses NETLIFY_DATABASE_URL automatically
const IS_PROD = process.env.NODE_ENV === 'production';

// ---- Config ----
const JWT_SECRET = new TextEncoder().encode(requiredEnv('JWT_SECRET'));
const COOKIE_NAME = 'pa_session';

// ---- Schemas ----
export const emailSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200)
});

// ---- Helpers ----
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders }
  });
}
export function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
export function lower(s) { return s?.toLowerCase?.() ?? s; }

export function parseCookies(header) {
  const out = {};
  (header || '').split(/; */).forEach(kv => {
    if (!kv) return;
    const i = kv.indexOf('=');
    const k = i >= 0 ? kv.slice(0, i).trim() : kv.trim();
    const v = i >= 0 ? decodeURIComponent(kv.slice(i + 1)) : '';
    out[k] = v;
  });
  return out;
}

// ---- Users (Neon) ----
export async function findUserByEmail(email) {
  const rows = await sql`select * from users where email = ${email} limit 1`;
  return rows[0] || null;
}
export async function findUserByProvider(provider, provider_id) {
  const rows = await sql`
    select * from users where provider = ${provider} and provider_id = ${provider_id} limit 1`;
  return rows[0] || null;
}
export async function createLocalUser(email, password, name = null) {
  const password_hash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    const rows = await sql`
      insert into users (email, name, password_hash, provider)
      values (${email}, ${name}, ${password_hash}, 'local')
      returning *`;
    return rows[0];
  } catch (e) {
    // unique_violation (23505)
    if (String(e?.message || '').includes('duplicate key')) {
      throw new Error('An account with this email already exists');
    }
    throw e;
  }
}
export async function upsertOAuthUser({ provider, provider_id, email, name }) {
  // If provider id exists, use it; else upsert by email (merge name)
  const existingByProv = await findUserByProvider(provider, provider_id);
  if (existingByProv) return existingByProv;

  const rows = await sql`
    insert into users (email, name, provider, provider_id)
    values (${email}, ${name}, ${provider}, ${provider_id})
    on conflict (email) do update set
      name = excluded.name,
      provider = excluded.provider,
      provider_id = excluded.provider_id,
      updated_at = now()
    returning *`;
  return rows[0];
}

// ---- Sessions (JWT in httpOnly cookie) ----
export async function issueSession(user) {
  return await new SignJWT({
    uid: user.id, email: user.email, provider: user.provider
  })
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuedAt()
  .setExpirationTime('7d')
  .sign(JWT_SECRET);
}
export async function readSession(req) {
  const cookie = parseCookies(req.headers.get('cookie'))[COOKIE_NAME];
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, JWT_SECRET);
    return payload; // { uid, email, provider, iat, exp }
  } catch {
    return null;
  }
}
export function sessionCookie(token) {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    IS_PROD ? 'Secure' : null,
    `Max-Age=${60 * 60 * 24 * 7}`
  ].filter(Boolean).join('; ');
  return attrs;
}
export function clearSessionCookie() {
  const attrs = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    IS_PROD ? 'Secure' : null,
    'Max-Age=0'
  ].filter(Boolean).join('; ');
  return attrs;
}

// ---- OAuth (Google) ----
export async function pkcePair() {
  const code_verifier = base64url(randomBytes(32));
  const enc = new TextEncoder();
  const digest = await webcrypto.subtle.digest('SHA-256', enc.encode(code_verifier));
  const code_challenge = base64url(Buffer.from(digest));
  return { code_verifier, code_challenge };
}
export function randomState() { return base64url(randomBytes(16)); }
function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
export const GoogleJWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));


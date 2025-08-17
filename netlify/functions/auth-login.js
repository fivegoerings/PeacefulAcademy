import { emailSchema, findUserByEmail, issueSession, sessionCookie } from './_shared/auth.js';
import argon2 from 'argon2';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { email, password } = emailSchema.parse(await req.json());
    const user = await findUserByEmail(email.toLowerCase());
    if (!user || !user.password_hash) throw new Error('Invalid email or password');
    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) throw new Error('Invalid email or password');
    const token = await issueSession(user);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'set-cookie': sessionCookie(token), 'content-type':'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Login failed' }), { status: 400, headers:{'content-type':'application/json'} });
  }
};


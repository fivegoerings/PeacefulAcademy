import { emailSchema, createLocalUser, issueSession, sessionCookie } from './_shared/auth.js';

export default async (req, context) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const body = await req.json();
    const { email, password } = emailSchema.parse(body);
    const user = await createLocalUser(email.toLowerCase(), password);
    const token = await issueSession(user);
    return new Response(JSON.stringify({ ok: true, user: { email: user.email }}), {
      status: 200,
      headers: { 'set-cookie': sessionCookie(token), 'content-type':'application/json' }
    });
  } catch (e) {
    const msg = e?.issues?.[0]?.message || e?.message || 'Registration failed';
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers:{'content-type':'application/json'} });
  }
};


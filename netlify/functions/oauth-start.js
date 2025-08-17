import { pkcePair } from './_shared/auth.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // e.g. https://YOUR-SITE/.netlify/functions/oauth-callback

export default async (_req, context) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return new Response(JSON.stringify({ error:'Google OAuth not configured' }), { status:500, headers:{'content-type':'application/json'} });
  }
  const { code_verifier, code_challenge } = await pkcePair();

  // Use Netlify’s cookie-based ephemeral store (or signed cookie). For simplicity:
  const headers = new Headers({ 'content-type':'application/json' });
  headers.append('Set-Cookie', `pkce=${code_verifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return new Response(JSON.stringify({ authUrl }), { status:200, headers });
};


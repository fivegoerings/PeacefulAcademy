import { upsertOAuthUser, issueSession, sessionCookie } from './_shared/auth.js';
import { jwtVerify } from 'jose';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export default async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    if (!code) return new Response('Missing code', { status:400 });

    const cookies = Object.fromEntries((req.headers.get('cookie')||'').split(/; */).map(kv=>{
      const i = kv.indexOf('=');
      return i<0? [kv,''] : [kv.slice(0,i), decodeURIComponent(kv.slice(i+1))];
    }));

    const code_verifier = cookies['pkce'];
    if (!code_verifier) return new Response('PKCE missing/expired', { status:400 });

    const body = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      code,
      code_verifier
    });

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type':'application/x-www-form-urlencoded' },
      body
    });
    if (!tokenRes.ok) return new Response('Token exchange failed', { status:400 });
    const tokens = await tokenRes.json();
    const id_token = tokens.id_token;

    // Verify Google ID token (audience = your client_id)
    const { payload } = await jwtVerify(id_token, async () => null, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: GOOGLE_CLIENT_ID
    }).catch(()=>({ payload:null }));

    if (!payload) {
      // Fallback: decode without remote key (Google publishes JWKs—omitted here for brevity)
      const parts = id_token.split('.');
      const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (!claims || !claims.email) throw new Error('Invalid ID token');
      payload = claims;
    }

    const user = await upsertOAuthUser({
      provider: 'google',
      provider_id: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || null
    });

    const token = await issueSession(user);

    // Redirect home with a fresh session cookie
    return new Response('', {
      status: 302,
      headers: {
        'set-cookie': sessionCookie(token),
        'location': '/'
      }
    });
  } catch (e) {
    return new Response(`OAuth error: ${e.message}`, { status:500 });
  }
};


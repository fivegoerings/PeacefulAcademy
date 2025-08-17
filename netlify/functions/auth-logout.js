import { clearSessionCookie } from './_shared/auth.js';

export default async () => {
  return new Response(JSON.stringify({ ok:true }), {
    status: 200,
    headers: { 'set-cookie': clearSessionCookie(), 'content-type':'application/json' }
  });
};


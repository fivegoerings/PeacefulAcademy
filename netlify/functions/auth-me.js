import { readSession } from './_shared/auth.js';

export default async (req) => {
  const sess = await readSession(req);
  if (!sess) return new Response(JSON.stringify({ authenticated:false }), { status: 200, headers:{'content-type':'application/json'} });
  return new Response(JSON.stringify({ authenticated:true, user: { email: sess.email, provider: sess.provider }}), { status:200, headers:{'content-type':'application/json'} });
};


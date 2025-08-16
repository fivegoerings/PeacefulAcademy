export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS' } });
  }
  return new Response(
    JSON.stringify({
      ok: true,
      method: req.method,
      path: new URL(req.url).pathname,
      now: new Date().toISOString(),
    }),
    { status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }
  );
};

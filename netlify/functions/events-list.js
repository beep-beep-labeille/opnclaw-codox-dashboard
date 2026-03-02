const { sbFetch, ok, cors } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  if (event.httpMethod !== 'GET') return ok({ ok: false, error: 'method_not_allowed' }, 405);

  const params = event.queryStringParameters || {};
  const limit = Math.min(parseInt(params.limit || '200', 10) || 200, 1000);

  // Basic filters
  const agent = (params.agent || '').trim();
  const status = (params.status || '').trim();

  // Supabase PostgREST query
  // Example: /rest/v1/events?select=*&order=event_time.desc&limit=200&agent=eq.A1
  const q = new URLSearchParams();
  q.set('select', '*');
  q.set('order', 'event_time.desc');
  q.set('limit', '' + limit);
  if (agent) q.set('agent', 'eq.' + agent);
  if (status) q.set('status', 'eq.' + status);

  const rows = await sbFetch('/rest/v1/events', { query: q.toString() });
  return ok({ ok: true, rows });
};

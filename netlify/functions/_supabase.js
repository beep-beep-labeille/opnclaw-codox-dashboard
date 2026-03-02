function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function supabaseConfig() {
  const url = getEnv('SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  return { url, serviceKey };
}

async function sbFetch(path, { method = 'GET', query = '', json, headers = {} } = {}) {
  const { url, serviceKey } = supabaseConfig();
  const full = `${url}${path}${query ? `?${query}` : ''}`;

  const r = await fetch(full, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: json ? JSON.stringify(json) : undefined,
  });

  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!r.ok) {
    const err = new Error(`Supabase error ${r.status}`);
    err.statusCode = r.status;
    err.data = data;
    throw err;
  }

  return data;
}

function ok(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

function cors() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: '',
  };
}

module.exports = { sbFetch, ok, cors };

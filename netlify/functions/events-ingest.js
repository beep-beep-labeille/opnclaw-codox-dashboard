const { sbFetch, ok, cors } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  if (event.httpMethod !== 'POST') return ok({ ok: false, error: 'method_not_allowed' }, 405);

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch { return ok({ ok:false, error:'invalid_json' }, 400); }

  // Optional shared secret to protect the endpoint
  const required = process.env.INGEST_API_KEY;
  if (required) {
    const provided = payload.apiKey || event.headers['x-api-key'] || event.headers['X-Api-Key'];
    if (provided !== required) return ok({ ok:false, error:'unauthorized' }, 401);
  }

  const row = payload.row || payload || {};

  // Map some common keys to DB columns (accepts both camelCase and nice labels)
  const normalized = {
    event_time: row.event_time || row.eventTime || row.Date || row.date || null,
    agent: row.agent || row.Agent || null,
    platform: row.platform || row.Plateforme || row.Platform || null,
    source_group: row.source_group || row.sourceGroup || row['Groupe/Source'] || row.group || row.Group || null,
    post_url: row.post_url || row.postUrl || row.URL || row['URL post/fil'] || null,
    person: row.person || row.Personne || row.Person || null,
    profile_url: row.profile_url || row.profileUrl || row.Profil || null,
    action_type: row.action_type || row.actionType || row.Action || row['Action (commentaire/DM/admin)'] || null,
    message: row.message || row.Message || row['Message/Commentaire'] || null,
    status: row.status || row.Statut || row.Status || null,
    next_action: row.next_action || row.nextAction || row['Prochaine action'] || null,
    due_date: row.due_date || row.dueDate || row.Échéance || row.Echeance || row['Échéance'] || null,
    priority: row.priority || row.Priorité || row.Priority || null,
    product: row.product || row['Produit/Gig'] || row.Produit || null,
    offer_eur: row.offer_eur || row.offerEur || row['Devis (€)'] || row.Devis || null,
    prob_pct: row.prob_pct || row.probPct || row['Probabilité %'] || row.Probabilité || null,
    result: row.result || row.Résultat || row.Resultat || null,
    notes: row.notes || row.Notes || null,
    event_key: row.event_key || row.eventKey || row.EventId || row.eventId || null,
  };

  // Remove null/empty event_time to let DB default
  if (!normalized.event_time) delete normalized.event_time;

  // Idempotency: if event_key provided, upsert
  const prefer = normalized.event_key ? { Prefer: 'resolution=merge-duplicates,return=representation' } : { Prefer: 'return=representation' };

  const inserted = await sbFetch('/rest/v1/events', {
    method: 'POST',
    headers: {
      ...prefer,
      ...(normalized.event_key ? { 'Content-Type': 'application/json', } : {}),
    },
    json: normalized.event_key ? [normalized] : [normalized],
  });

  return ok({ ok: true, inserted });
};

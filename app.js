// Fiverr Agent Ops Dashboard (static)
// Data source: CSV (local file, Google Sheets published CSV, or custom endpoint)
// Optional write-back: Google Apps Script Web App endpoint.

function parseCsv(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const cols = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        // handle escaped double quotes ""
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        cols.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    cols.push(cur);
    return cols;
  };

  const headers = parseLine(lines.shift()).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.map(line => {
    const cols = parseLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      const raw = cols[idx] ?? '';
      obj[h] = ('' + raw).replace(/^"|"$/g, '');
    });
    return obj;
  });

  return { headers, rows };
}

function toCsv(headers, rows) {
  const esc = (v) => ('' + (v ?? '')).replaceAll('"', '""');
  const head = headers.map(h => `"${esc(h)}"`).join(',');
  const body = rows.map(r => headers.map(h => `"${esc(r[h])}"`).join(',')).join('\n');
  return head + '\n' + body + (rows.length ? '\n' : '');
}

const DEFAULT_HEADERS = [
  'Date',
  'Agent',
  'Plateforme',
  'Groupe/Source',
  'URL post/fil',
  'Personne',
  'Profil',
  'Action (commentaire/DM/admin)',
  'Message/Commentaire',
  'Statut',
  'Dernière action',
  'Prochaine action',
  'Échéance',
  'Priorité',
  'Produit/Gig',
  'Devis (€)',
  'Probabilité %',
  'Résultat',
  'Notes'
];

const LS = {
  sheetsCsvUrl: 'sheetsCsvUrl',
  statusCol: 'statusCol',
  agentCol: 'agentCol',
  appsScriptUrl: 'appsScriptUrl',
  apiKey: 'apiKey'
};

let state = {
  headers: [...DEFAULT_HEADERS],
  rows: [],
  editIndex: null,
  settings: {
    sheetsCsvUrl: localStorage.getItem(LS.sheetsCsvUrl) || '',
    statusCol: localStorage.getItem(LS.statusCol) || 'Statut',
    agentCol: localStorage.getItem(LS.agentCol) || 'Agent',
    appsScriptUrl: localStorage.getItem(LS.appsScriptUrl) || '',
    apiKey: localStorage.getItem(LS.apiKey) || ''
  }
};

function log(msg) {
  const ul = document.querySelector('#activityLog');
  if (!ul) return;
  const li = document.createElement('li');
  const ts = new Date().toLocaleString();
  li.textContent = `[${ts}] ${msg}`;
  ul.prepend(li);
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))].sort((a, b) => ('' + a).localeCompare('' + b));
}

function buildFilters() {
  const statusSel = document.querySelector('#statusFilter');
  const agentSel = document.querySelector('#agentFilter');
  if (!statusSel || !agentSel) return;

  // reset
  statusSel.innerHTML = '<option value="">Statut: Tous</option>';
  agentSel.innerHTML = '<option value="">Agent: Tous</option>';

  const sCol = state.settings.statusCol;
  const aCol = state.settings.agentCol;

  const statuses = uniq(state.rows.map(r => (r[sCol] || '').trim()));
  const agents = uniq(state.rows.map(r => (r[aCol] || '').trim()));

  statuses.forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    statusSel.appendChild(o);
  });

  agents.forEach(a => {
    const o = document.createElement('option');
    o.value = a;
    o.textContent = a;
    agentSel.appendChild(o);
  });
}

function renderKpis(filteredRows) {
  const el = document.querySelector('#kpis');
  if (!el) return;
  const n = filteredRows.length;

  const moneyCol = state.headers.find(h => h.toLowerCase().includes('devis'));
  const probCol = state.headers.find(h => h.toLowerCase().includes('prob'));

  const sum = (rows, col) => rows.reduce((acc, r) => acc + (parseFloat(('' + (r[col] || '')).replace(',', '.')) || 0), 0);

  let total = moneyCol ? sum(filteredRows, moneyCol) : 0;
  let weighted = 0;
  if (moneyCol && probCol) {
    weighted = filteredRows.reduce((acc, r) => {
      const v = parseFloat(('' + (r[moneyCol] || '')).replace(',', '.')) || 0;
      const p = parseFloat(('' + (r[probCol] || '')).replace(',', '.')) || 0;
      return acc + v * (p / 100);
    }, 0);
  }

  el.innerHTML = [
    `<div class="kpi"><div class="kpiLabel">Entrées</div><div class="kpiValue">${n}</div></div>`,
    moneyCol ? `<div class="kpi"><div class="kpiLabel">Devis total (€)</div><div class="kpiValue">${total.toFixed(0)}</div></div>` : '',
    (moneyCol && probCol) ? `<div class="kpi"><div class="kpiLabel">CA pondéré (€)</div><div class="kpiValue">${weighted.toFixed(0)}</div></div>` : ''
  ].join('');
}

function render() {
  const tbody = document.querySelector('#dataTable tbody');
  const theadRow = document.querySelector('#theadRow');

  const q = (document.querySelector('#search')?.value || '').toLowerCase();
  const statusV = document.querySelector('#statusFilter')?.value || '';
  const agentV = document.querySelector('#agentFilter')?.value || '';

  // headers
  theadRow.innerHTML = '';
  state.headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    theadRow.appendChild(th);
  });
  const thA = document.createElement('th');
  thA.textContent = 'Actions';
  theadRow.appendChild(thA);

  const sCol = state.settings.statusCol;
  const aCol = state.settings.agentCol;

  const filtered = state.rows.filter(r => {
    const matchQ = !q || Object.values(r).join(' ').toLowerCase().includes(q);
    const matchS = !statusV || ((r[sCol] || '') === statusV);
    const matchA = !agentV || ((r[aCol] || '') === agentV);
    return matchQ && matchS && matchA;
  });

  tbody.innerHTML = '';
  filtered.forEach((r, i) => {
    const tr = document.createElement('tr');

    // cells
    state.headers.forEach(h => {
      const td = document.createElement('td');
      const v = r[h] || '';
      if (('' + h).toLowerCase().includes('url') || ('' + h).toLowerCase().includes('lien')) {
        td.innerHTML = v ? `<a href="${v}" target="_blank" rel="noopener">Ouvrir</a>` : '';
      } else {
        td.textContent = v;
      }
      td.setAttribute('data-th', h);
      tr.appendChild(td);
    });

    const tdActions = document.createElement('td');
    tdActions.setAttribute('data-th', 'Actions');
    tdActions.innerHTML = `
      <button data-act="edit" data-i="${i}">Éditer</button>
      <button data-act="dup" data-i="${i}">Dupliquer</button>
      <button data-act="del" data-i="${i}">Suppr.</button>
    `;
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  renderKpis(filtered);
}

function inferInputType(header) {
  const h = header.toLowerCase();
  if (h.includes('date') || h.includes('échéance') || h.includes('echeance')) return 'date';
  if (h.includes('€') || h.includes('eur') || h.includes('montant') || h.includes('prob')) return 'number';
  if (h.includes('url') || h.includes('lien')) return 'url';
  return 'text';
}

function buildFormGrid(index) {
  const grid = document.querySelector('#formGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const data = index == null ? {} : state.rows[index];

  state.headers.forEach(h => {
    const type = inferInputType(h);
    const label = document.createElement('label');
    label.textContent = h;

    let input;
    if (h.toLowerCase().includes('note') || h.toLowerCase().includes('message') || h.toLowerCase().includes('comment')) {
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      input.type = type;
      if (type === 'number') input.step = '0.01';
    }

    input.name = h;
    input.value = data[h] || '';
    label.appendChild(input);
    grid.appendChild(label);
  });
}

function openDialog(index) {
  const dlg = document.querySelector('#rowDialog');
  const form = document.querySelector('#rowForm');
  document.querySelector('#dialogTitle').textContent = index == null ? 'Nouvelle entrée' : 'Modifier entrée';
  form.reset();
  buildFormGrid(index);
  state.editIndex = index;
  dlg.showModal();
}

async function pushRowToAppsScript(action, row, meta = {}) {
  const url = state.settings.appsScriptUrl;
  if (!url) return { ok: false, skipped: true };

  const payload = {
    action,
    apiKey: state.settings.apiKey || undefined,
    headers: state.headers,
    row,
    meta
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Apps Script error (${r.status}): ${t}`);
  }

  return r.json().catch(() => ({ ok: true }));
}

async function saveDialog(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  state.headers.forEach(h => { data[h] = form.elements[h]?.value ?? ''; });

  if (state.editIndex == null) {
    state.rows.unshift(data);
    log('Nouvelle entrée ajoutée');
    render();
    try {
      await pushRowToAppsScript('append', data);
      log('Écriture Sheets: OK (append)');
    } catch (err) {
      log('Écriture Sheets: échec (voir console)');
      console.error(err);
    }
  } else {
    const old = state.rows[state.editIndex];
    state.rows[state.editIndex] = data;
    log('Entrée mise à jour');
    render();
    try {
      await pushRowToAppsScript('update', data, { previous: old });
      log('Écriture Sheets: OK (update)');
    } catch (err) {
      log('Écriture Sheets: échec (voir console)');
      console.error(err);
    }
  }

  document.querySelector('#rowDialog').close();
}

function exportCsv() {
  const csv = toCsv(state.headers, state.rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fiverr_agent_ops_dashboard.csv';
  a.click();
  log('Export CSV téléchargé');
}

function importCsv(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const { headers, rows } = parseCsv(e.target.result);
      state.headers = headers.length ? headers : [...DEFAULT_HEADERS];
      state.rows = rows;
      buildFilters();
      render();
      log('CSV importé');
    } catch (err) {
      alert('CSV invalide');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

async function syncFromSheets() {
  const url = state.settings.sheetsCsvUrl;
  if (!url) {
    alert('Renseigne l\'URL CSV publié de Google Sheets dans Paramètres.');
    return;
  }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Fetch error');
    const csv = await r.text();
    const { headers, rows } = parseCsv(csv);
    state.headers = headers.length ? headers : [...DEFAULT_HEADERS];
    state.rows = rows;
    buildFilters();
    render();
    log('Synchronisation Google Sheets terminée');
  } catch (e) {
    alert('Impossible de récupérer le CSV (vérifie le lien publié / permissions).');
    console.error(e);
  }
}

function openSettings() {
  const dlg = document.querySelector('#settingsDialog');
  document.querySelector('#sheetsCsvUrl').value = state.settings.sheetsCsvUrl || '';
  document.querySelector('#statusCol').value = state.settings.statusCol || '';
  document.querySelector('#agentCol').value = state.settings.agentCol || '';
  document.querySelector('#appsScriptUrl').value = state.settings.appsScriptUrl || '';
  document.querySelector('#apiKey').value = state.settings.apiKey || '';
  dlg.showModal();
}

function saveSettings(e) {
  e.preventDefault();
  state.settings.sheetsCsvUrl = document.querySelector('#sheetsCsvUrl').value.trim();
  state.settings.statusCol = document.querySelector('#statusCol').value.trim() || 'Statut';
  state.settings.agentCol = document.querySelector('#agentCol').value.trim() || 'Agent';
  state.settings.appsScriptUrl = document.querySelector('#appsScriptUrl').value.trim();
  state.settings.apiKey = document.querySelector('#apiKey').value.trim();

  localStorage.setItem(LS.sheetsCsvUrl, state.settings.sheetsCsvUrl);
  localStorage.setItem(LS.statusCol, state.settings.statusCol);
  localStorage.setItem(LS.agentCol, state.settings.agentCol);
  localStorage.setItem(LS.appsScriptUrl, state.settings.appsScriptUrl);
  localStorage.setItem(LS.apiKey, state.settings.apiKey);

  document.querySelector('#settingsDialog').close();
  buildFilters();
  render();
  log('Paramètres enregistrés');
}

async function loadInitial() {
  // If settings has sheetsCsvUrl, we sync. Otherwise try local seed CSV.
  if (state.settings.sheetsCsvUrl) {
    await syncFromSheets();
    return;
  }

  try {
    const r = await fetch('../comeup_outreach_dashboard.csv');
    const csv = await r.text();
    const { headers, rows } = parseCsv(csv);
    state.headers = headers.length ? headers : [...DEFAULT_HEADERS];
    state.rows = rows;
  } catch (e) {
    // empty
    state.rows = [];
  }

  buildFilters();
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  loadInitial();

  document.querySelector('#search')?.addEventListener('input', render);
  document.querySelector('#statusFilter')?.addEventListener('change', render);
  document.querySelector('#agentFilter')?.addEventListener('change', render);

  document.body.addEventListener('click', e => {
    if (e.target.matches('#addRowBtn')) openDialog(null);
    if (e.target.matches('#settingsBtn')) openSettings();
    if (e.target.matches('#syncSheetsBtn')) syncFromSheets();

    if (e.target.matches('[data-act="edit"]')) openDialog(parseInt(e.target.dataset.i, 10));
    if (e.target.matches('[data-act="dup"]')) {
      const i = parseInt(e.target.dataset.i, 10);
      const r = JSON.parse(JSON.stringify(state.rows[i]));
      state.rows.unshift(r);
      buildFilters();
      render();
      log('Entrée dupliquée');
    }
    if (e.target.matches('[data-act="del"]')) {
      const i = parseInt(e.target.dataset.i, 10);
      if (confirm('Supprimer cette entrée ?')) {
        state.rows.splice(i, 1);
        buildFilters();
        render();
        log('Entrée supprimée (local)');
        // Optional: implement delete in Apps Script if needed.
      }
    }

    if (e.target.matches('#exportCsvBtn')) exportCsv();
    if (e.target.matches('#importCsvBtn')) document.querySelector('#importCsvInput').click();
  });

  document.querySelector('#importCsvInput')?.addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) importCsv(f);
    e.target.value = '';
  });

  document.querySelector('#rowForm')?.addEventListener('submit', saveDialog);
  document.querySelector('#settingsForm')?.addEventListener('submit', saveSettings);
});

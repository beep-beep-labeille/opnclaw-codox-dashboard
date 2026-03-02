# Google Apps Script (Web App) — write-back to Google Sheets

But : permettre au dashboard (et à OpenClaw) d’**écrire** dans le Google Sheet.

## 1) Créer le script

1. Ouvre Google Sheets
2. **Extensions → Apps Script**
3. Crée un fichier `Code.gs` et colle le code ci-dessous

## 2) Déployer en Web App

- **Déployer → Nouveau déploiement → Type : Application Web**
- Exécuter en tant que : **toi**
- Accès : **Tout le monde** (ou “Toute personne disposant du lien”) —
  
⚠️ Mets une `API_KEY` pour éviter l’écriture publique.

Copie l’URL `https://script.google.com/macros/s/.../exec`.

## 3) Configurer le dashboard

Dans **Paramètres** :
- URL Apps Script
- API Key

## 4) Appeler depuis OpenClaw

OpenClaw peut `fetch`/HTTP-POST vers cette URL avec le JSON décrit plus bas.

---

## Code `Code.gs`

```js
const API_KEY = 'CHANGE_ME';

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return json_({ ok: true, message: 'alive' });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    if (API_KEY && payload.apiKey !== API_KEY) {
      return json_({ ok: false, error: 'unauthorized' });
    }

    const action = payload.action || 'append';
    const headers = payload.headers || [];
    const row = payload.row || {};

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];

    // If sheet is empty, write headers
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow === 0) {
      if (!headers.length) return json_({ ok:false, error:'no headers provided' });
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Read headers from sheet (row 1)
    const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (action === 'append') {
      const values = sheetHeaders.map(h => row[h] ?? '');
      sheet.appendRow(values);
      return json_({ ok: true, action: 'append' });
    }

    // Minimal update strategy: append-only by default.
    // For update/delete, you’ll want an immutable ID column.
    if (action === 'update') {
      return json_({ ok: false, error: 'update_not_implemented', hint: 'Add an ID column and implement row lookup.' });
    }

    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: '' + err });
  }
}
```

## Payload attendu

```json
{
  "action": "append",
  "apiKey": "CHANGE_ME",
  "headers": ["Date","Agent","Plateforme"],
  "row": {
    "Date": "2026-03-02",
    "Agent": "agent-01",
    "Plateforme": "Facebook"
  }
}
```

## Note importante (update/delete)

Pour une V2 solide :
- ajoute une colonne `ID` (uuid) dans le Sheet
- le dashboard envoie `ID`
- Apps Script fait un lookup et met à jour la ligne correspondante

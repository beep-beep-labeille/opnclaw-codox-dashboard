# Fiverr Agent Ops Dashboard

Dashboard léger (HTML/CSS/JS) pour suivre l’avancement de tes agents qui développent ton activité de consultant Fiverr via :
- recherche de groupes Skool / Facebook
- commentaires et outreach (DM)
- suivi des statuts, prochaines actions, échéances, résultats

## Données (Google Sheets comme base)

Le dashboard supporte 3 modes :

1) **Google Sheets (lecture)** : tu publies ton Google Sheet en CSV, le dashboard fait un `fetch()` sur l’URL.
2) **CSV local** : import/export CSV.
3) **Google Sheets (écriture, optionnel)** : via un endpoint **Google Apps Script** (Web App) qui accepte des `POST` JSON.

> Objectif OpenClaw : OpenClaw peut appeler l’endpoint Apps Script pour logger des actions d’agents, ou tu peux saisir/manipuler dans le dashboard.

## Setup (lecture via CSV publié)

Dans Google Sheets :
- **Fichier → Partager → Publier sur le Web**
- Choisis la bonne feuille, format **CSV**
- Récupère l’URL `.../export?format=csv&gid=...`

Dans le dashboard : **Paramètres → URL Google Sheets (CSV publié)**.

## Setup (écriture via Apps Script) — recommandé

Voir `apps-script/README.md` pour créer un Web App qui reçoit :

```json
{ "action": "append", "apiKey": "...", "headers": ["Date", "Agent", ...], "row": {"Date":"2026-03-02", ...} }
```

Ensuite dans le dashboard : **Paramètres → URL Apps Script + API key**.

## Déploiement Netlify

Voir `README_DEPLOY_NETLIFY.md`.

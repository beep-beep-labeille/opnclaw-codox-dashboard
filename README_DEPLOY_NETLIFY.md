# Déploiement Netlify (statique)

Projet: ComeUp Outreach Dashboard (frontend pur, sans build)

## Option A — Drag & Drop (sans Git)
1. Ouvre https://app.netlify.com/drop (connecte-toi si besoin)
2. Fais glisser le dossier `outreach-dashboard/` entier (celui qui contient `index.html`, `styles.css`, `app.js`, `netlify.toml`).
3. Netlify crée le site immédiatement. Copie l’URL publique.

## Option B — Connecter un repo GitHub
1. Crée un repo et pousse le dossier `outreach-dashboard/` à la racine du repo.
2. Sur Netlify → "Add new site" → "Import an existing project" → choisis le repo.
3. Build command: (vide)  | Publish directory: `outreach-dashboard`
4. Déploie. Netlify publie automatiquement sur chaque commit.

## Option C — CLI (si tu me donnes le token)
1. Installe: `npm i -g netlify-cli`
2. `netlify login` (ouvre le navigateur) ou fournis un token `NETLIFY_AUTH_TOKEN`.
3. Dans `outreach-dashboard/` :
   - `netlify init` (créer/associer un site)
   - `netlify deploy --prod --dir .`

Le site est purement statique, aucune config serveur nécessaire.

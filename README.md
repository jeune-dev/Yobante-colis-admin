# Yobante Colis — Administration

Back-office de l'API [yobnate-colis-back](https://github.com/jeune-dev/yobnate-colis-back)
(transport de colis France ⇄ Sénégal). Réservé aux comptes `admin` et `super_admin`.

## Stack

Vite · React 19 · TypeScript · React Router · TanStack Query · axios · zustand.
Identité visuelle reprise de `yobante-admin` (bleu Yobante, police DM Sans).

## Démarrage

```bash
npm install
cp .env.example .env     # ajuster VITE_API_PROXY_TARGET si le backend n'est pas sur :5001
npm run dev              # http://localhost:5175
```

Le navigateur appelle `/api/...` ; le serveur Vite relaie vers le backend. Il n'y a donc
aucun CORS à configurer, et le cookie httpOnly du refresh token circule normalement.

En production, servir `dist/` derrière un relais qui transmet `/api` au backend (Nginx : `deploy/` ;
Render : réécriture de `render.yaml`). Une URL d'API absolue dans `VITE_API_URL` reste possible mais
oblige à garder le refresh token côté navigateur et à autoriser l'origine dans `CORS_ORIGIN`.

## Qualité et sécurité

| Commande | Rôle |
|---|---|
| `npm run type-check` | TypeScript strict |
| `npm run lint` | ESLint (règles des hooks React, pas de `any`) |
| `npm test` | Vitest + Testing Library (filtres d'URL, liens, CSP, formulaires, ErrorBoundary) |
| `npm run verify` | Les trois, puis le build de production |

La même vérification tourne sur GitHub Actions à chaque push (`.github/workflows/ci.yml`).

Mesures de sécurité côté navigateur :
- **CSP** générée au build dans `index.html` (`src/lib/csp.ts`) : scripts limités au site, appels réseau limités
  au site et à l'origine de `VITE_API_URL` ; `frame-ancestors`, HSTS et `Permissions-Policy` envoyés par Render.
- **Documents imprimables** (étiquettes, factures, manifestes) ouverts avec leur propre CSP sans script
  (`confinerHtml`) : ils partagent l'origine du back-office.
- **Liens venant de l'API** filtrés (`urlSure` : http/https seulement ; `routeDepuisLien` : chemins internes seulement).
- **Session** synchronisée entre onglets (le refresh token est à usage unique).

Les droits réels sont vérifiés par le backend : masquer un bouton ici n'est qu'un confort d'interface.

## Déploiement sur Render

Le fichier `render.yaml` décrit un **site statique** : `npm ci && npm run build`, publication de `dist/`,
réécriture de toutes les URL vers `index.html` (React Router) et en-têtes de cache et de sécurité.

1. Dans Render : **New > Blueprint**, choisir le dépôt `jeune-dev/Yobante-colis-admin`, branche `main`.
2. Laisser `VITE_API_URL` **vide** : la règle de réécriture `/api/*` de `render.yaml` relaie les appels
   vers `https://yobnate-colis-back.onrender.com/api/v1/*`. Le navigateur ne parle qu'au domaine de
   l'admin : pas de CORS, et le refresh token reste dans le cookie httpOnly (`sameSite=strict`) du
   backend, jamais en `localStorage`. Si l'URL du backend change, modifier la destination de la règle.
3. Vite lit `VITE_API_URL` **au build** : après une modification, relancer un déploiement.

Chaque push sur `main` redéploie automatiquement.

## Écrans

Couverture complète du contrat d'API du back-office (`CONTRAT-API-ADMIN.md`, 207 routes).

| Menu | Fonctions |
|---|---|
| Tableau de bord · Analyses | Indicateurs, points d'attention, ventes, fidélisation, marge, conversion, trafic, avis, stock, vue par pays |
| Colis | Liste filtrable (vues rapides, filtres avancés, recherche par n° de suivi ou de pièce), statistiques, export CSV, événements en lot ; détail : étude (validation, refus, proposition XXL), événements, pesée, modification, point de retrait, coursier, coût de revient, photos, notes, étiquettes et bordereau |
| Conteneurs | Création, modification, chargement, statut propagé aux colis, coût réparti au poids, manifeste |
| Enlèvements · Tournées | Planification, démarrage, clôture, annulation, feuille de route par coursier ; tournées de collecte avec ouverture et notification des clients |
| Douane · Inventaire | Tableau de bord, déclarations, articles SH, documents, statut, facture commerciale ; inventaire imprimable ou CSV |
| Réclamations | Statistiques, messages avec pièces jointes, notes internes, assignation, priorité, résolution avec avoir |
| Factures · Paiements | Statistiques, encaissement, remise, échéance, avoir, annulation, relances, caisse d'un point, remboursement, export CSV |
| Clients · Parrainage · Personnel · Administrateurs | Fiches, conditions commerciales, crédits de parrainage, comptes coursiers/agents, gestion des admins (super admin) |
| Réseau | Points de collecte (fiche, stock, statistiques, horaires, maintenance, transfert, photo), villes, zones |
| Tarification | Services, tarifs au poids (grille complète, audit), grille forfaitaire, surcharges (simulateur), jours fériés (import) |
| Catalogue & contenus | Emballages et photos, annonces, avis clients, FAQ, versions de l'application mobile |
| Système | Paramètres (enregistrement groupé, initialisation), modèles d'email avec aperçu, demandes de suppression de compte, journal |
| Compte | Profil, photo, mot de passe, préférences, notifications (cloche du bandeau), mot de passe oublié |

## Organisation

```
src/
├── api/          client axios (enveloppe { success, data }, refresh du jeton), types
├── auth/         session (zustand persisté) et page de connexion
├── components/   Layout, cloche de notifications, FormModal (formulaires déclaratifs), Icon, UI
├── lib/          libellés des référentiels, formatage, hooks (filtres dans l'URL, actions), listes de choix
└── pages/        un dossier par domaine
```

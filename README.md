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

En production, servir `dist/` derrière un reverse proxy qui relaie `/api` vers le backend,
ou définir `VITE_API_URL` avec l'URL publique de l'API (le backend doit alors l'autoriser
dans `CORS_ORIGIN`).

## Déploiement sur Render

Le fichier `render.yaml` décrit un **site statique** : `npm ci && npm run build`, publication de `dist/`,
réécriture de toutes les URL vers `index.html` (React Router) et en-têtes de cache et de sécurité.

1. Dans Render : **New > Blueprint**, choisir le dépôt `jeune-dev/Yobante-colis-admin`, branche `main`.
2. Renseigner `VITE_API_URL` avec l'URL publique de l'API **préfixe `/api/v1` compris**
   (valeur provisoire : `https://yobnate-colis-back.onrender.com/api/v1`).
   Vite l'intègre **au build** : après l'avoir modifiée, relancer un déploiement.
3. Côté backend, ajouter l'URL du site Render (par ex. `https://yobante-colis-admin.onrender.com`)
   à `CORS_ORIGIN`, sinon le navigateur bloque les appels.

Chaque push sur `main` redéploie automatiquement. Le jeton de rafraîchissement est envoyé dans le
corps des requêtes : le cookie `sameSite=strict` du backend n'est pas nécessaire entre deux domaines.

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

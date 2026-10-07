// Aperçu temporaire (non versionné) de la page Paramètres avec des données fictives
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ParametresPage from './pages/systeme/ParametresPage';
import Layout from './components/Layout';
import { Toasts } from './components/ui';
import { useAuth } from './auth/store';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import './styles.css';

const session = { accessToken: 'x', utilisateur: { id: '1', nom: 'Admin', prenom: 'Super', email: 'a@a', role: 'super_admin' } } as const;
useAuth.setState(session);
// Sans backend, les appels en arrière-plan (cloche…) déconnectent : on garde la session fictive
useAuth.subscribe((s) => { if (!s.utilisateur) useAuth.setState(session); });
const p = (cle: string, valeur: string, type: string, categorie: string, libelle: string) => ({ id: cle, cle, valeur, type, categorie, libelle, modifiable: true });
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, enabled: false } } });
qc.setQueryData(['parametres'], [
  p('collecte_domicile_active', 'true', 'booleen', 'collecte', 'Collecte à domicile activée'),
  p('grille_colissimo', '[{"poidsMaxKg":0.25,"prixHt":7.89},{"poidsMaxKg":0.5,"prixHt":8.76},{"poidsMaxKg":0.75,"prixHt":9.65},{"poidsMaxKg":1,"prixHt":10.39},{"poidsMaxKg":2,"prixHt":11.53}]', 'json', 'collecte', 'Tarif HT Colissimo par tranche de poids'),
  p('grille_enlevement_domicile_fr', '[{"nbColis":1,"prixHt":3.6},{"nbColis":2,"prixHt":4.7},{"nbColis":3,"prixHt":5.8}]', 'json', 'collecte', 'Tarif HT de l enlèvement à domicile en France, par nombre de colis'),
  p('adresse_reception_fr', '{"nom": "Yobante Colis — Réception France", "adresse": "", "codePostal": "", "ville": "Clermont-Ferrand", "telephone": "", "instructions": "Indiquez votre nom et votre numéro de suivi sur le colis."}', 'json', 'expedition', 'Adresse de réception des colis en France'),
  p('produits_interdits', '["Produits inflammables, explosifs ou gaz sous pression", "Batteries lithium seules", "Armes et munitions", "Stupéfiants"]', 'json', 'expedition', 'Produits interdits (information fret aérien)'),
  p('evenements_whatsapp', '["RECEPTION", "DEPART_HUB", "ARR_PAYS", "DISPO", "LIVRE"]', 'json', 'notifications', 'Événements de suivi notifiés par WhatsApp'),
].map((x) => ({ ...x, type: x.type as 'json' })) as never);

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}>
    <MemoryRouter initialEntries={['/parametres']}>
      <Routes><Route element={<Layout />}><Route path="parametres" element={<ParametresPage />} /></Route></Routes>
    </MemoryRouter>
    <Toasts />
  </QueryClientProvider>
);

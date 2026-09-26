import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import NotificationsBell from './NotificationsBell';
import { Loader } from './ui';
import ErrorBoundary from './ErrorBoundary';
import logo from '@/logo.png';
import { useAuth } from '@/auth/store';
import { api } from '@/api/client';
import { ROLES } from '@/lib/labels';
import { initiales, nomComplet } from '@/lib/format';

type Page = { to: string; label: string; icon: string; sub: string };
type Entree = { section: string } | Page;

const NAV: Entree[] = [
  { section: 'Pilotage' },
  { to: '/', label: 'Tableau de bord', icon: 'layout-dashboard', sub: "Vue d'ensemble de l'activité" },
  { to: '/analyses', label: 'Analyses', icon: 'activity', sub: 'Ventes, conversion, trafic, avis et stock' },
  { section: 'Opérations' },
  { to: '/colis', label: 'Colis', icon: 'package', sub: 'Expéditions, étude des demandes et suivi' },
  { to: '/conteneurs', label: 'Conteneurs', icon: 'ship', sub: 'Départs groupés, chargement et coûts' },
  { to: '/enlevements', label: 'Enlèvements', icon: 'truck', sub: 'Collectes à domicile et feuilles de route' },
  { to: '/tournees', label: 'Tournées de collecte', icon: 'calendar', sub: 'Collectes programmées par zone' },
  { to: '/douane', label: 'Douane', icon: 'file-text', sub: 'Déclarations et dédouanement' },
  { to: '/inventaire', label: 'Inventaire', icon: 'clipboard-list', sub: 'Produits chargés par conteneur ou tournée' },
  { to: '/reclamations', label: 'Réclamations', icon: 'life-buoy', sub: 'Service après-vente' },
  { section: 'Finance' },
  { to: '/factures', label: 'Factures', icon: 'file-text', sub: 'Facturation multi-devise, avoirs, relances' },
  { to: '/paiements', label: 'Paiements', icon: 'credit-card', sub: 'Encaissements, caisse et remboursements' },
  { section: 'Clients & équipe' },
  { to: '/clients', label: 'Clients', icon: 'users', sub: 'Comptes clients et conditions commerciales' },
  { to: '/parrainage', label: 'Parrainage', icon: 'sparkles', sub: 'Parrains, filleuls et crédits' },
  { to: '/personnel', label: 'Personnel', icon: 'user', sub: 'Coursiers et agents de point' },
  { to: '/administrateurs', label: 'Administrateurs', icon: 'lock', sub: 'Comptes du back-office' },
  { section: 'Réseau' },
  { to: '/points-collecte', label: 'Points de collecte', icon: 'map-pin', sub: 'Réseau France et Sénégal' },
  { to: '/villes', label: 'Villes', icon: 'building', sub: 'Référentiel géographique' },
  { to: '/zones', label: 'Zones', icon: 'grid', sub: 'Zones tarifaires' },
  { section: 'Tarification' },
  { to: '/services', label: 'Services', icon: 'ship', sub: "Offres d'expédition et délais" },
  { to: '/tarifs', label: 'Tarifs au poids', icon: 'scale', sub: 'Grille service × corridor × poids' },
  { to: '/grille-tarifaire', label: 'Grille forfaitaire', icon: 'tag', sub: 'Prix forfaitaires par article' },
  { to: '/surcharges', label: 'Surcharges', icon: 'coins', sub: 'Carburant, zone éloignée, options…' },
  { to: '/jours-feries', label: 'Jours fériés', icon: 'calendar', sub: 'Calendrier des jours non ouvrés' },
  { section: 'Catalogue & contenus' },
  { to: '/emballages', label: 'Emballages', icon: 'shopping-bag', sub: 'Barigots, cartons et prestations' },
  { to: '/annonces', label: 'Annonces', icon: 'message-square', sub: "Messages sur l'accueil de l'application" },
  { to: '/avis', label: 'Avis clients', icon: 'star', sub: 'Modération des évaluations' },
  { to: '/faq', label: 'FAQ', icon: 'inbox', sub: 'Questions fréquentes' },
  { to: '/versions-app', label: "Versions de l'app", icon: 'smartphone', sub: "Mises à jour de l'application mobile" },
  { section: 'Système' },
  { to: '/parametres', label: 'Paramètres', icon: 'settings', sub: 'Réglages du moteur métier' },
  { to: '/modeles-emails', label: "Modèles d'email", icon: 'mail', sub: 'Emails envoyés aux clients' },
  { to: '/suppressions-compte', label: 'Suppressions de compte', icon: 'trash-2', sub: 'Demandes RGPD' },
  { to: '/journal', label: "Journal d'activité", icon: 'activity', sub: 'Traçabilité des actions' },
];

// Pages accessibles hors menu (bandeau), pour le titre
const AUTRES: Page[] = [
  { to: '/profil', label: 'Mon profil', icon: 'user', sub: 'Informations, mot de passe et notifications' },
  { to: '/notifications', label: 'Notifications', icon: 'inbox', sub: 'Alertes du back-office' },
];

const PAGES = [...NAV.filter((e): e is Page => 'to' in e), ...AUTRES];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { utilisateur, refreshToken, clear } = useAuth();
  const [ouvert, setOuvert] = useState(false);

  // Page courante : la plus longue route qui préfixe l'URL (/colis/123 → Colis)
  const page =
    PAGES.filter((p) => (p.to === '/' ? pathname === '/' : pathname.startsWith(p.to))).sort(
      (a, b) => b.to.length - a.to.length
    )[0] ?? PAGES[0];

  const deconnexion = async () => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // La session locale est effacée même si l'API ne répond pas
    }
    clear();
    navigate('/login');
  };

  return (
    <div className="app">
      {ouvert && <div className="sb-voile" onClick={() => setOuvert(false)} />}
      <aside className={`sb${ouvert ? ' open' : ''}`}>
        <div className="sb-top">
          <img className="sb-logo" src={logo} alt="Yobante" />
          <div>
            <div className="sb-name">Yobante Colis</div>
            <div className="sb-sub">Administration France ⇄ Sénégal</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((e, i) =>
            'section' in e ? (
              <div key={i} className="nav-section">
                {e.section}
              </div>
            ) : (
              <NavLink
                key={e.to}
                to={e.to}
                end={e.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={() => setOuvert(false)}
              >
                <Icon name={e.icon} size={17} />
                {e.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="sb-foot">
          <div className="user-pill">
            <Link to="/profil" className="ava" title="Mon profil" onClick={() => setOuvert(false)}>{initiales(utilisateur)}</Link>
            <Link to="/profil" className="user-info" style={{ color: 'inherit' }} onClick={() => setOuvert(false)}>
              <div className="user-name">{nomComplet(utilisateur)}</div>
              <div className="user-role">{ROLES[utilisateur?.role ?? ''] ?? utilisateur?.role}</div>
            </Link>
            <button className="btn ghost sm" onClick={deconnexion} title="Déconnexion">
              <Icon name="log-out" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn ghost sm burger" onClick={() => setOuvert((o) => !o)} aria-label="Menu">
            <Icon name="grid" size={18} />
          </button>
          <div>
            <div className="page-title">{page.label}</div>
            <div className="page-sub">{page.sub}</div>
          </div>
          <div className="topbar-right">
            <NotificationsBell />
          </div>
        </header>
        <div className="content">
          {/* La barre latérale reste affichée pendant le chargement d'une page */}
          <ErrorBoundary cle={pathname}>
            <Suspense fallback={<Loader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

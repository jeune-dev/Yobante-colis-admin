import { Suspense, useEffect, useRef, useState } from 'react';
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
import { MOBILE, useMediaQuery } from '@/lib/hooks';

type Page = { to: string; label: string; icon: string; sub: string; section?: string };
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
  { to: '/demandes-contact', label: 'Demandes de contact', icon: 'mail', sub: 'Messages des sites vitrines' },
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

// Chaque page retient sa section, pour le fil d'Ariane du bandeau (« Opérations › Colis »)
const PAGES: Page[] = [
  ...NAV.reduce<{ section?: string; pages: Page[] }>(
    (acc, e) => ('section' in e ? { ...acc, section: e.section } : { ...acc, pages: [...acc.pages, { ...e, section: acc.section }] }),
    { pages: [] }
  ).pages,
  ...AUTRES,
];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { utilisateur, refreshToken, clear } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const [compte, setCompte] = useState(false);
  const zoneCompte = useRef<HTMLDivElement>(null);
  // Le tiroir n'existe que sur mobile : au-delà, le menu est toujours affiché
  const mobile = useMediaQuery(MOBILE);
  const tiroir = ouvert && mobile;
  const burger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  // Fermés à chaque changement de page (lien, retour arrière, redirection)
  useEffect(() => {
    setOuvert(false);
    setCompte(false);
  }, [pathname]);

  // Menu du compte : un clic ailleurs ou Échap le referme
  useEffect(() => {
    if (!compte) return;
    const clic = (e: MouseEvent) => !zoneCompte.current?.contains(e.target as Node) && setCompte(false);
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setCompte(false);
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', echap);
    return () => {
      document.removeEventListener('mousedown', clic);
      document.removeEventListener('keydown', echap);
    };
  }, [compte]);

  // Tiroir ouvert : Échap le ferme, la page derrière ne défile plus, le focus
  // entre dans le menu puis revient au bouton à la fermeture
  useEffect(() => {
    if (!tiroir) return;
    const bouton = burger.current;
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('keydown', echap);
    document.documentElement.classList.add('tiroir-ouvert');
    menu.current?.querySelector<HTMLElement>('a')?.focus();
    return () => {
      document.removeEventListener('keydown', echap);
      document.documentElement.classList.remove('tiroir-ouvert');
      bouton?.focus();
    };
  }, [tiroir]);

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
      {tiroir && <div className="sb-voile" onClick={() => setOuvert(false)} />}
      <aside id="menu-principal" ref={menu} className={`sb${tiroir ? ' open' : ''}`} aria-label="Menu principal">
        <Link to="/" className="sb-top" title="Yobante Colis" onClick={() => setOuvert(false)}>
          <img className="sb-logo" src={logo} alt="Yobante Colis" />
          <div>
            <div className="sb-name">
              Yobante <span>Colis</span>
            </div>
            <div className="sb-sub">Administration</div>
          </div>
        </Link>
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
                title={e.label}
                onClick={() => setOuvert(false)}
              >
                <Icon name={e.icon} size={17} />
                <span className="nav-label">{e.label}</span>
              </NavLink>
            )
          )}
        </nav>
      </aside>

      {/* Tiroir ouvert : le reste de la page est inerte (focus piégé dans le menu) */}
      <div className="main" inert={tiroir}>
        <header className="topbar">
          <button ref={burger} className="btn ghost sm burger" onClick={() => setOuvert((o) => !o)} aria-label="Menu"
            aria-expanded={tiroir} aria-controls="menu-principal">
            <Icon name="menu" size={20} />
          </button>
          <nav className="ariane" aria-label="Fil d'Ariane">
            <ol>
              {page.section && (
                <>
                  <li className="ariane-groupe">{page.section}</li>
                  <li className="ariane-groupe ariane-sep" aria-hidden="true">
                    <Icon name="chevron-right" size={14} />
                  </li>
                </>
              )}
              <li className="page-title" aria-current="page" title={page.sub}>
                {page.label}
              </li>
            </ol>
          </nav>
          <div className="topbar-right">
            <NotificationsBell />
            <div className="compte" ref={zoneCompte}>
              <button
                className={`compte-btn${compte ? ' ouvert' : ''}`}
                onClick={() => setCompte((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={compte}
                title="Mon compte"
              >
                <span className="ava">
                  {/* Photo de profil si elle existe, sinon les initiales */}
                  {utilisateur?.avatarUrl ? <img src={utilisateur.avatarUrl} alt="" /> : initiales(utilisateur)}
                </span>
                <span className="user-info">
                  <span className="user-name">{nomComplet(utilisateur)}</span>
                  <span className="user-role">{ROLES[utilisateur?.role ?? ''] ?? utilisateur?.role}</span>
                </span>
                <Icon name="chevron-right" size={14} className="compte-chevron" />
              </button>
              {compte && (
                <div className="compte-menu" role="menu">
                  {/* Le nom est répété ici : sur petit écran il est masqué dans le bouton */}
                  <div className="compte-entete">
                    <span className="ava">
                      {utilisateur?.avatarUrl ? <img src={utilisateur.avatarUrl} alt="" /> : initiales(utilisateur)}
                    </span>
                    <span className="user-info">
                      <span className="user-name">{nomComplet(utilisateur)}</span>
                      <span className="user-role">{utilisateur?.email}</span>
                    </span>
                  </div>
                  <Link to="/profil" role="menuitem" className="compte-item">
                    <Icon name="user" size={16} />
                    Mon profil
                  </Link>
                  <button role="menuitem" className="compte-item danger" onClick={deconnexion}>
                    <Icon name="log-out" size={16} />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
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

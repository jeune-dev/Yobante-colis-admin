import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader } from './components/ui';
import { estAdmin, useAuth } from './auth/store';
import LoginPage from './auth/LoginPage';
import MotDePasseOubliePage from './auth/MotDePasseOubliePage';
import Layout from './components/Layout';
import { D, R, nouvelleAdresse } from '@/lib/routes';
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalysesPage = lazy(() => import('./pages/AnalysesPage'));
const ColisListPage = lazy(() => import('./pages/colis/ColisListPage'));
const ColisDetailPage = lazy(() => import('./pages/colis/ColisDetailPage'));
const ConteneursPage = lazy(() => import('./pages/conteneurs/ConteneursPage'));
const ConteneurDetailPage = lazy(() => import('./pages/conteneurs/ConteneurDetailPage'));
const EnlevementsPage = lazy(() => import('./pages/operations/EnlevementsPage'));
const TourneesCollectePage = lazy(() => import('./pages/operations/TourneesCollectePage'));
const DouanePage = lazy(() => import('./pages/operations/DouanePage'));
const DouaneDetailPage = lazy(() => import('./pages/operations/DouaneDetailPage'));
const InventairePage = lazy(() => import('./pages/operations/InventairePage'));
const ReclamationsPage = lazy(() => import('./pages/reclamations/ReclamationsPage'));
const ReclamationDetailPage = lazy(() => import('./pages/reclamations/ReclamationDetailPage'));
const FacturesPage = lazy(() => import('./pages/finance/FacturesPage'));
const FactureDetailPage = lazy(() => import('./pages/finance/FactureDetailPage'));
const PaiementsPage = lazy(() => import('./pages/finance/PaiementsPage'));
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/clients/ClientDetailPage'));
const ParrainagePage = lazy(() => import('./pages/clients/ParrainagePage'));
const PersonnelPage = lazy(() => import('./pages/clients/PersonnelPage'));
const AdminsPage = lazy(() => import('./pages/clients/AdminsPage'));
const PointsCollectePage = lazy(() => import('./pages/reseau/PointsCollectePage'));
const PointDetailPage = lazy(() => import('./pages/reseau/PointDetailPage'));
const VillesPage = lazy(() => import('./pages/reseau/VillesPage'));
const ZonesPage = lazy(() => import('./pages/reseau/ZonesPage'));
const GrilleTarifairePage = lazy(() => import('./pages/reseau/GrilleTarifairePage'));
const ServicesPage = lazy(() => import('./pages/tarifs/ServicesPage'));
const TarifsPage = lazy(() => import('./pages/tarifs/TarifsPage'));
const SurchargesPage = lazy(() => import('./pages/tarifs/SurchargesPage'));
const JoursFeriesPage = lazy(() => import('./pages/tarifs/JoursFeriesPage'));
const EmballagesPage = lazy(() => import('./pages/catalogue/EmballagesPage'));
const AnnoncesPage = lazy(() => import('./pages/catalogue/AnnoncesPage'));
const AvisPage = lazy(() => import('./pages/contenus/AvisPage'));
const FaqPage = lazy(() => import('./pages/contenus/FaqPage'));
const VersionsAppPage = lazy(() => import('./pages/contenus/VersionsAppPage'));
const SuppressionsComptePage = lazy(() => import('./pages/contenus/SuppressionsComptePage'));
const ParametresPage = lazy(() => import('./pages/systeme/ParametresPage'));
const ModelesEmailsPage = lazy(() => import('./pages/systeme/ModelesEmailsPage'));
const JournalPage = lazy(() => import('./pages/systeme/JournalPage'));
const ProfilPage = lazy(() => import('./pages/compte/ProfilPage'));
const NotificationsPage = lazy(() => import('./pages/compte/NotificationsPage'));

/**
 * Accès au back-office : session présente ET rôle d'administration. Le backend reste
 * seul juge (chaque route /admin vérifie le rôle) ; ceci évite d'afficher l'interface
 * à une session incohérente. La page demandée est mémorisée pour y revenir après connexion.
 */
function Protege({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  const utilisateur = useAuth((s) => s.utilisateur);
  const { pathname, search } = useLocation();
  if (token && estAdmin(utilisateur)) return <>{children}</>;
  return <Navigate to={R.connexion} replace state={{ depuis: pathname + search }} />;
}

/** Favoris et liens antérieurs à /admin : redirection vers l'adresse équivalente. */
function AncienneAdresse() {
  const { pathname, search } = useLocation();
  const cible = nouvelleAdresse(pathname);
  return <Navigate to={cible ? cible + search : R.tableauDeBord} replace />;
}

function PageIntrouvable() {
  return (
    <div className="empty">
      <p><strong>Page introuvable</strong></p>
      <p className="small muted">L'adresse demandée ne correspond à aucun écran du back-office.</p>
      <Link to={R.tableauDeBord} className="btn secondary sm" style={{ marginTop: 12 }}>Retour au tableau de bord</Link>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/admin" element={<Navigate to={R.tableauDeBord} replace />} />
      <Route path={R.connexion} element={<LoginPage />} />
      <Route path={R.motDePasseOublie} element={<MotDePasseOubliePage />} />
      <Route
        element={
          <Protege>
            <Layout />
          </Protege>
        }
      >
        <Route path={R.tableauDeBord} element={<DashboardPage />} />
        <Route path={R.analyses} element={<AnalysesPage />} />

        <Route path={R.colis} element={<ColisListPage />} />
        <Route path={`${D.colis}/:id`} element={<ColisDetailPage />} />
        <Route path={R.conteneurs} element={<ConteneursPage />} />
        <Route path={`${D.conteneur}/:id`} element={<ConteneurDetailPage />} />
        <Route path={R.enlevements} element={<EnlevementsPage />} />
        <Route path={R.tournees} element={<TourneesCollectePage />} />
        <Route path={R.douane} element={<DouanePage />} />
        <Route path={`${D.douane}/:id`} element={<DouaneDetailPage />} />
        <Route path={R.inventaire} element={<InventairePage />} />
        <Route path={R.reclamations} element={<ReclamationsPage />} />
        <Route path={`${D.reclamation}/:id`} element={<ReclamationDetailPage />} />

        <Route path={R.factures} element={<FacturesPage />} />
        <Route path={`${D.facture}/:id`} element={<FactureDetailPage />} />
        <Route path={R.paiements} element={<PaiementsPage />} />

        <Route path={R.clients} element={<ClientsPage />} />
        <Route path={`${D.client}/:id`} element={<ClientDetailPage />} />
        <Route path={R.parrainage} element={<ParrainagePage />} />
        <Route path={R.personnel} element={<PersonnelPage />} />
        <Route path={R.administrateurs} element={<AdminsPage />} />

        <Route path={R.pointsCollecte} element={<PointsCollectePage />} />
        <Route path={`${D.pointCollecte}/:id`} element={<PointDetailPage />} />
        <Route path={R.villes} element={<VillesPage />} />
        <Route path={R.zones} element={<ZonesPage />} />

        <Route path={R.services} element={<ServicesPage />} />
        <Route path={R.tarifs} element={<TarifsPage />} />
        <Route path={R.grilleTarifaire} element={<GrilleTarifairePage />} />
        <Route path={R.surcharges} element={<SurchargesPage />} />
        <Route path={R.joursFeries} element={<JoursFeriesPage />} />

        <Route path={R.emballages} element={<EmballagesPage />} />
        <Route path={R.annonces} element={<AnnoncesPage />} />
        <Route path={R.avis} element={<AvisPage />} />
        <Route path={R.faq} element={<FaqPage />} />
        <Route path={R.versionsApp} element={<VersionsAppPage />} />

        <Route path={R.parametres} element={<ParametresPage />} />
        <Route path={R.modelesEmails} element={<ModelesEmailsPage />} />
        <Route path={R.suppressionsCompte} element={<SuppressionsComptePage />} />
        <Route path={R.journal} element={<JournalPage />} />

        <Route path={R.profil} element={<ProfilPage />} />
        <Route path={R.notifications} element={<NotificationsPage />} />
        <Route path="/admin/*" element={<PageIntrouvable />} />
      </Route>
      {/* Anciennes adresses (sans /admin) : redirigées vers les nouvelles, sinon 404 */}
      <Route path="*" element={<AncienneAdresse />} />
    </Routes>
    </Suspense>
  );
}

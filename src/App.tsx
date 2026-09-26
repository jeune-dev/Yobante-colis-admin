import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader } from './components/ui';
import { useAuth } from './auth/store';
import LoginPage from './auth/LoginPage';
import MotDePasseOubliePage from './auth/MotDePasseOubliePage';
import Layout from './components/Layout';
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

function Protege({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOubliePage />} />
      <Route
        element={
          <Protege>
            <Layout />
          </Protege>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="analyses" element={<AnalysesPage />} />

        <Route path="colis" element={<ColisListPage />} />
        <Route path="colis/:id" element={<ColisDetailPage />} />
        <Route path="conteneurs" element={<ConteneursPage />} />
        <Route path="conteneurs/:id" element={<ConteneurDetailPage />} />
        <Route path="enlevements" element={<EnlevementsPage />} />
        <Route path="tournees" element={<TourneesCollectePage />} />
        <Route path="douane" element={<DouanePage />} />
        <Route path="douane/:id" element={<DouaneDetailPage />} />
        <Route path="inventaire" element={<InventairePage />} />
        <Route path="reclamations" element={<ReclamationsPage />} />
        <Route path="reclamations/:id" element={<ReclamationDetailPage />} />

        <Route path="factures" element={<FacturesPage />} />
        <Route path="factures/:id" element={<FactureDetailPage />} />
        <Route path="paiements" element={<PaiementsPage />} />

        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="parrainage" element={<ParrainagePage />} />
        <Route path="personnel" element={<PersonnelPage />} />
        <Route path="administrateurs" element={<AdminsPage />} />

        <Route path="points-collecte" element={<PointsCollectePage />} />
        <Route path="points-collecte/:id" element={<PointDetailPage />} />
        <Route path="villes" element={<VillesPage />} />
        <Route path="zones" element={<ZonesPage />} />

        <Route path="services" element={<ServicesPage />} />
        <Route path="tarifs" element={<TarifsPage />} />
        <Route path="grille-tarifaire" element={<GrilleTarifairePage />} />
        <Route path="surcharges" element={<SurchargesPage />} />
        <Route path="jours-feries" element={<JoursFeriesPage />} />

        <Route path="emballages" element={<EmballagesPage />} />
        <Route path="annonces" element={<AnnoncesPage />} />
        <Route path="avis" element={<AvisPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="versions-app" element={<VersionsAppPage />} />

        <Route path="parametres" element={<ParametresPage />} />
        <Route path="modeles-emails" element={<ModelesEmailsPage />} />
        <Route path="suppressions-compte" element={<SuppressionsComptePage />} />
        <Route path="journal" element={<JournalPage />} />

        <Route path="profil" element={<ProfilPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, Reclamation } from '@/api/types';
import { Card, Chips, Empty, ErrorBox, Loader, Pagination, SearchInput, Stat, StatutBadge } from '@/components/ui';
import { PRIORITES, STATUTS_RECLAMATION, TYPES_RECLAMATION, libelle } from '@/lib/labels';
import { date, nomComplet, montant } from '@/lib/format';
import { useFiltres } from '@/lib/hooks';
import ResponsiveTable from '@/components/ResponsiveTable';

interface Statistiques {
  parStatut: { statut: string; total: number }[];
  parType: { type: string; total: number }[];
  indemnisations: { nombre: number; montantTotal: number };
  satisfactionMoyenne: number | null;
}

const VUES = [
  { value: 'ouvertes', label: 'En cours de traitement' },
  { value: 'nonAssignees', label: 'Non assignées' },
  { value: 'enRetard', label: 'Échéance dépassée' },
  { value: '', label: 'Toutes' },
];
const CLES = ['ouvertes', 'nonAssignees', 'enRetard'] as const;

export default function ReclamationsPage() {
  const navigate = useNavigate();
  const { filtres, page, set, modifier, setPage } = useFiltres({
    reference: '', statut: '', type: '', priorite: '', ouvertes: 'true', nonAssignees: '', enRetard: '',
  });
  const vue = CLES.find((k) => filtres[k] === 'true') ?? '';

  const q = useQuery({
    queryKey: ['reclamations', filtres, page],
    queryFn: () => api.get<Liste<'reclamations', Reclamation>>('/admin/reclamations', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({
    queryKey: ['reclamations', 'statistiques'],
    queryFn: () => api.get<{ statistiques: Statistiques }>('/admin/reclamations/statistiques').then((r) => r.statistiques),
  });
  const nb = (s: string) => stats.data?.parStatut.find((x) => x.statut === s)?.total ?? 0;

  return (
    <>
      <div className="stats">
        <Stat icon="inbox" ton="orange" value={stats.data ? nb('ouverte') : '—'} label="Ouvertes" onClick={() => set('statut', 'ouverte')} />
        <Stat icon="clock" ton="bleu" value={stats.data ? nb('en_cours') + nb('attente_client') : '—'} label="En traitement" />
        <Stat icon="check-circle" ton="vert" value={stats.data ? nb('resolue') + nb('cloturee') : '—'} label="Résolues ou clôturées" />
        <Stat icon="coins" ton="violet"
          value={stats.data ? stats.data.indemnisations.nombre : '—'}
          label="Indemnisations"
          hint={stats.data ? `Total ${stats.data.indemnisations.montantTotal.toLocaleString('fr-FR')}` : undefined} />
        <Stat icon="star" ton="cyan"
          value={stats.data?.satisfactionMoyenne != null ? `${stats.data.satisfactionMoyenne.toFixed(1)} / 5` : '—'}
          label="Satisfaction moyenne" />
      </div>

      <div className="toolbar">
        <SearchInput value={filtres.reference} onChange={(v) => set('reference', v)} placeholder="Référence…" />
        <Chips options={VUES} value={vue} onChange={(v) => modifier(Object.fromEntries(CLES.map((k) => [k, k === v ? 'true' : ''])))} />
        <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_RECLAMATION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filtres.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPES_RECLAMATION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.priorite} onChange={(e) => set('priorite', e.target.value)}>
          <option value="">Toutes priorités</option>
          {Object.entries(PRIORITES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.reclamations.length ? <Empty>{vue === 'ouvertes' ? 'Aucune réclamation en cours de traitement — voir « Toutes »' : 'Aucune réclamation'}</Empty> : (
          <ResponsiveTable
            lignes={q.data.reclamations}
            cleLigne={(r) => r.id}
            onLigne={(r) => navigate(`/reclamations/${r.id}`)}
            colonnes={[
              { cle: 'reference', titre: 'Référence', className: 'mono', mobile: 'soustitre', cellule: (r) => r.reference },
              { cle: 'objet', titre: 'Objet', mobile: 'titre', cellule: (r) => r.objet },
              { cle: 'type', titre: 'Type', className: 'small', cellule: (r) => libelle(TYPES_RECLAMATION, r.type) },
              { cle: 'client', titre: 'Client', cellule: (r) => nomComplet(r.client) },
              { cle: 'colis', titre: 'Colis', className: 'mono', priorite: 'basse', cellule: (r) => r.colis?.reference ?? '—' },
              { cle: 'reclame', titre: 'Réclamé', className: 'right', cellule: (r) => montant(r.montantReclame, r.devise) },
              { cle: 'agent', titre: 'Agent', className: 'small', priorite: 'basse', cellule: (r) => (r.agentAssigne ? nomComplet(r.agentAssigne) : <span className="muted">—</span>) },
              { cle: 'priorite', titre: 'Priorité', cellule: (r) => <StatutBadge table={PRIORITES} valeur={r.priorite} /> },
              { cle: 'statut', titre: 'Statut', cellule: (r) => <StatutBadge table={STATUTS_RECLAMATION} valeur={r.statut} /> },
              { cle: 'echeance', titre: 'Échéance', className: 'small muted', cellule: (r) => date(r.dateEcheance) },
            ]}
          />
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Colis, Liste } from '@/api/types';
import { estAdmin, useAuth } from '@/auth/store';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Badge, Card, Chips, Empty, ErrorBox, Loader, Pagination, SearchInput, Stat, StatutBadge, toast } from '@/components/ui';
import { CATEGORIES, CATEGORIES_COURT, MODES_DEPOT, STATUTS_COLIS, TYPES_CONTENU } from '@/lib/labels';
import { date, montant, poids, telecharger } from '@/lib/format';
import { useFiltres, useInvalider } from '@/lib/hooks';

const VUES = [
  { value: '', label: 'Tous' },
  { value: 'aEtudier', label: 'À étudier' },
  { value: 'etudeEnRetard', label: 'Étude en retard' },
  { value: 'enRetard', label: 'En retard' },
  { value: 'enSouffrance', label: 'En souffrance' },
  { value: 'sansRotation', label: 'Sans conteneur' },
];
const CLES_VUES = ['aEtudier', 'etudeEnRetard', 'enRetard', 'enSouffrance', 'sansRotation'] as const;

interface Statistiques {
  total: number;
  chiffreAffaires: number;
  parDevise?: { devise: string; total: number; chiffreAffaires: number; panierMoyen: number }[];
  poidsTotalKg: number;
  panierMoyen: number;
  parCorridor: { corridor: string; total: number; poidsKg: number }[];
}

interface CodeEvenement { code: string; libelle: string; statutInduit: string | null }

export default function ColisListPage() {
  const navigate = useNavigate();
  const admin = estAdmin(useAuth((s) => s.utilisateur));
  const invalider = useInvalider();
  const [avances, setAvances] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [lot, setLot] = useState(false);
  const [numero, setNumero] = useState('');

  const { filtres, page, set, modifier, setPage } = useFiltres({
    reference: '', statut: '', categorie: '', paysDepart: '', typeContenu: '', modeDepot: '',
    expediteur: '', destinataire: '', produit: '', dateDebut: '', dateFin: '',
    aEtudier: '', etudeEnRetard: '', enRetard: '', enSouffrance: '', sansRotation: '',
  });
  const vue = CLES_VUES.find((k) => filtres[k] === 'true') ?? '';

  const q = useQuery({
    queryKey: ['colis', filtres, page],
    queryFn: () => api.get<Liste<'colis', Colis>>('/admin/colis', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({
    queryKey: ['colis', 'statistiques', filtres],
    queryFn: () => api.get<{ statistiques: Statistiques }>('/admin/colis/statistiques', filtres).then((r) => r.statistiques),
    placeholderData: keepPreviousData,
  });
  const codes = useQuery({
    queryKey: ['codes-evenements'],
    queryFn: () => api.get<{ evenements: CodeEvenement[] }>('/admin/colis/codes-evenements').then((r) => r.evenements),
    staleTime: Infinity,
    enabled: lot,
  });

  const choisirVue = (v: string) => modifier(Object.fromEntries(CLES_VUES.map((k) => [k, k === v ? 'true' : ''])));

  const exporter = async () => {
    try {
      telecharger(await api.blob('/admin/colis/export', filtres), `colis-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      toast.error(e);
    }
  };

  const rechercher = async () => {
    if (!numero.trim()) return;
    try {
      const r = await api.get<{ colis: Colis }>(`/admin/colis/recherche/${encodeURIComponent(numero.trim())}`);
      navigate(`/colis/${r.colis.id}`);
    } catch (e) {
      toast.error(e);
    }
  };

  const lignes = q.data?.colis ?? [];
  const toutCoche = lignes.length > 0 && lignes.every((c) => selection.includes(c.id));
  const basculer = (id: string) => setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const basculerTout = () =>
    setSelection((s) => (toutCoche ? s.filter((id) => !lignes.some((c) => c.id === id)) : [...new Set([...s, ...lignes.map((c) => c.id)])]));

  return (
    <>
      <div className="stats">
        <Stat icon="package" value={stats.data?.total ?? '—'} label="Colis (sélection)" />
        {!stats.data?.parDevise?.length && <Stat icon="coins" ton="vert" value="—" label="Chiffre d'affaires" />}
        {stats.data?.parDevise?.map((d) => (
          <Stat key={d.devise} icon="coins" ton="vert" value={montant(d.chiffreAffaires, d.devise)} label={`Chiffre d'affaires (${d.devise})`}
            hint={`panier moyen ${montant(d.panierMoyen, d.devise)}`} />
        ))}
        <Stat icon="scale" ton="violet" value={stats.data ? poids(stats.data.poidsTotalKg) : '—'} label="Poids total" />
      </div>

      <div className="toolbar">
        <SearchInput value={filtres.reference} onChange={(v) => set('reference', v)} placeholder="Filtrer par référence…" />
        <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_COLIS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filtres.categorie} onChange={(e) => set('categorie', e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.paysDepart} onChange={(e) => set('paysDepart', e.target.value)}>
          <option value="">Tous sens</option>
          <option value="FR">France → Sénégal</option>
          <option value="SN">Sénégal → France</option>
        </select>
        <button className="btn secondary" onClick={() => setAvances((a) => !a)}>
          <Icon name="settings" size={14} /> Filtres avancés
        </button>
        <div className="actions" style={{ marginLeft: 'auto' }}>
          <div className="search">
            <Icon name="search" size={15} />
            <input
              className="input"
              placeholder="N° de suivi ou de pièce ↵"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rechercher()}
            />
          </div>
          {admin && <button className="btn secondary" onClick={exporter}><Icon name="download" size={15} /> CSV</button>}
        </div>
      </div>

      {avances && (
        <Card>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            <input className="input" placeholder="Expéditeur" value={filtres.expediteur} onChange={(e) => set('expediteur', e.target.value)} />
            <input className="input" placeholder="Destinataire" value={filtres.destinataire} onChange={(e) => set('destinataire', e.target.value)} />
            <input className="input" placeholder="Produit (smartphone, frigo…)" value={filtres.produit} onChange={(e) => set('produit', e.target.value)} />
            <select className="select" value={filtres.typeContenu} onChange={(e) => set('typeContenu', e.target.value)}>
              <option value="">Tout contenu</option>
              {Object.entries(TYPES_CONTENU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="select" value={filtres.modeDepot} onChange={(e) => set('modeDepot', e.target.value)}>
              <option value="">Tout mode de dépôt</option>
              {Object.entries(MODES_DEPOT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" type="date" title="Créé à partir du" value={filtres.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
            <input className="input" type="date" title="Créé jusqu'au" value={filtres.dateFin} onChange={(e) => set('dateFin', e.target.value)} />
          </div>
        </Card>
      )}

      <div className="toolbar">
        <Chips options={VUES} value={vue} onChange={choisirVue} />
        {admin && selection.length > 0 && (
          <div className="actions" style={{ marginLeft: 'auto' }}>
            <span className="small muted" style={{ alignSelf: 'center' }}>{selection.length} sélectionné(s)</span>
            <button className="btn secondary sm" onClick={() => setSelection([])}>Désélectionner</button>
            <button className="btn sm" onClick={() => setLot(true)}><Icon name="plus" size={13} /> Événement en lot</button>
          </div>
        )}
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? (
          <Loader />
        ) : !lignes.length ? (
          <Empty>Aucun colis ne correspond aux filtres</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {admin && <th><input type="checkbox" checked={toutCoche} onChange={basculerTout} /></th>}
                  <th>Référence</th><th>Cat.</th><th>Expéditeur</th><th>Destinataire</th><th>Trajet</th>
                  <th>Poids</th><th className="right">Montant</th><th>Statut</th><th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((c) => (
                  <tr key={c.id} className="cliquable" onClick={() => navigate(`/colis/${c.id}`)}>
                    {admin && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selection.includes(c.id)} onChange={() => basculer(c.id)} />
                      </td>
                    )}
                    <td className="mono">{c.reference}</td>
                    <td><Badge ton="bleu">{CATEGORIES_COURT[c.categorie] ?? c.categorie}</Badge></td>
                    <td>{c.expediteurNom}</td>
                    <td>{c.destinataireNom}</td>
                    <td className="small">{c.villeDepart?.nom ?? c.paysDepart} → {c.villeArrivee?.nom ?? c.paysArrivee}</td>
                    <td className="small">{poids(c.poidsFactureKg)}</td>
                    <td className="right">{montant(c.montantTotal, c.devise)}</td>
                    <td>
                      <StatutBadge table={STATUTS_COLIS} valeur={c.statut} />
                      {c.enRetard && <> <Badge ton="rouge">Retard</Badge></>}
                    </td>
                    <td className="small muted">{date(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {lot && codes.data && (
        <FormModal
          title={`Événement pour ${selection.length} colis`}
          intro={<p className="small">Le même événement est appliqué à chaque colis ; ceux dont le statut ne le permet pas sont signalés.</p>}
          champs={[
            {
              name: 'codeEvenement', label: 'Événement', type: 'select', required: true, full: true,
              options: codes.data.map((e) => ({
                value: e.code,
                label: `${e.libelle}${e.statutInduit ? ` → ${STATUTS_COLIS[e.statutInduit]?.label ?? e.statutInduit}` : ' (information)'}`,
              })),
            },
            { name: 'lieu', label: 'Lieu' },
            { name: 'pays', label: 'Pays', type: 'select', options: { FR: 'France', SN: 'Sénégal' } },
            { name: 'commentaire', label: 'Commentaire', type: 'textarea' },
            { name: 'visiblePublic', label: 'Visible dans le suivi public', type: 'checkbox' },
          ]}
          initial={{ visiblePublic: true }}
          succes={false}
          onSubmit={async (corps) => {
            const r = await api.post<{ traites: unknown[]; erreurs: { message: string }[] }>('/admin/colis/evenements/lot', {
              ...corps,
              colisIds: selection,
            });
            toast.success(`${r.traites.length} colis mis à jour`);
            if (r.erreurs.length) toast.error(`${r.erreurs.length} refusé(s) : ${[...new Set(r.erreurs.map((e) => e.message))].join(' · ')}`);
            setSelection([]);
            invalider('colis', 'dashboard');
          }}
          onClose={() => setLot(false)}
        />
      )}
    </>
  );
}

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, Num } from '@/api/types';
import { Card, Chips, Empty, ErrorBox, Loader, Pagination, SearchInput, Stat, StatutBadge } from '@/components/ui';
import { INCOTERMS, OPTIONS_PAYS, PAYS, STATUTS_DOUANE, TYPES_CONTENU, libelle } from '@/lib/labels';
import { date, montant } from '@/lib/format';
import { useFiltres } from '@/lib/hooks';

export interface Declaration {
  id: string;
  colisId: string;
  motifExport: string;
  incoterm: string;
  paysExport: string;
  paysImport: string;
  valeurTotale: Num;
  devise: string;
  fraisTransport: Num;
  fraisAssurance: Num;
  poidsBrutKg?: Num;
  poidsNetKg?: Num;
  numeroEori?: string;
  numeroNinea?: string;
  numeroTvaIntracom?: string;
  numeroDeclaration?: string;
  factureCommercialeNumero?: string;
  droitsEstimes: Num;
  taxesEstimees: Num;
  droitsReels?: Num;
  taxesReelles?: Num;
  statut: string;
  motifBlocage?: string;
  dateSoumission?: string;
  dateDedouanement?: string;
  documents: { type: string; libelle?: string; url: string }[];
  commentaire?: string;
  createdAt: string;
  colis?: { id: string; reference: string; statut?: string; villeDepart?: { nom: string }; villeArrivee?: { nom: string } };
  articles?: ArticleDouane[];
}

export interface ArticleDouane {
  id: string;
  designation: string;
  codeSh?: string;
  quantite: Num;
  unite: string;
  valeurUnitaire: Num;
  valeurTotale?: Num;
  poidsNetKg?: Num;
  paysOrigine?: string;
  tauxDroits?: Num;
  marque?: string;
  etat?: string;
}

interface TableauDeBord {
  parStatut: { statut: string; total: number }[];
  dossiersBloques: { id: string; motifBlocage?: string; colis?: { reference: string } }[];
}

export default function DouanePage() {
  const navigate = useNavigate();
  const { filtres, page, set, setPage } = useFiltres({ statut: '', paysImport: '', incoterm: '', motifExport: '', aTraiter: '', numeroDeclaration: '' });

  const tdb = useQuery({
    queryKey: ['douane', 'tableau-de-bord'],
    queryFn: () => api.get<{ tableauDeBord: TableauDeBord }>('/admin/douane/tableau-de-bord').then((r) => r.tableauDeBord),
  });
  const q = useQuery({
    queryKey: ['douane', filtres, page],
    queryFn: () => api.get<Liste<'declarations', Declaration>>('/admin/douane', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="stats">
        {tdb.data?.parStatut.map((s) => (
          <Stat key={s.statut} icon={s.statut === 'bloquee' ? 'alert-triangle' : 'file-text'}
            ton={STATUTS_DOUANE[s.statut]?.ton ?? 'gris'} value={s.total} label={STATUTS_DOUANE[s.statut]?.label ?? s.statut}
            onClick={() => set('statut', s.statut)} />
        ))}
      </div>

      <div className="toolbar">
        <SearchInput value={filtres.numeroDeclaration} onChange={(v) => set('numeroDeclaration', v)} placeholder="N° de déclaration…" />
        <Chips options={[{ value: '', label: 'Toutes' }, { value: 'true', label: 'À traiter' }]} value={filtres.aTraiter} onChange={(v) => set('aTraiter', v)} />
        <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_DOUANE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filtres.paysImport} onChange={(e) => set('paysImport', e.target.value)}>
          <option value="">Tous pays d'import</option>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>Import {v}</option>)}
        </select>
        <select className="select" value={filtres.incoterm} onChange={(e) => set('incoterm', e.target.value)}>
          <option value="">DAP et DDP</option>
          <option value="DAP">DAP</option>
          <option value="DDP">DDP</option>
        </select>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.declarations.length ? <Empty>Aucune déclaration</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Colis</th><th>N° déclaration</th><th>Sens</th><th>Nature</th><th>Incoterm</th><th className="right">Valeur</th><th className="right">Droits + taxes est.</th><th>Statut</th><th>Créée le</th></tr></thead>
              <tbody>
                {q.data.declarations.map((d) => (
                  <tr key={d.id} className="cliquable" onClick={() => navigate(`/douane/${d.id}`)}>
                    <td className="mono">{d.colis?.reference ?? '—'}</td>
                    <td className="small">{d.numeroDeclaration || '—'}</td>
                    <td className="small">{libelle(PAYS, d.paysExport)} → {libelle(PAYS, d.paysImport)}</td>
                    <td className="small">{libelle(TYPES_CONTENU, d.motifExport)}</td>
                    <td title={INCOTERMS[d.incoterm]}>{d.incoterm}</td>
                    <td className="right">{montant(d.valeurTotale, d.devise)}</td>
                    <td className="right">{montant(Number(d.droitsEstimes) + Number(d.taxesEstimees), d.devise)}</td>
                    <td><StatutBadge table={STATUTS_DOUANE} valeur={d.statut} /></td>
                    <td className="small muted">{date(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>
    </>
  );
}

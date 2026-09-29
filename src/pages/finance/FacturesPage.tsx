import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Facture, Liste } from '@/api/types';
import Icon from '@/components/Icon';
import { Card, Chips, Empty, ErrorBox, Loader, Pagination, SearchInput, Stat, StatutBadge, toast, ligneCliquable } from '@/components/ui';
import { TYPES_FACTURE } from '@/lib/labels';

interface StatsFactures {
  parDevise: { devise: string; montantFacture: number; montantEncaisse: number; tauxRecouvrement: number }[];
  encoursClients: { devise: string; solde: number }[];
}
import { STATUTS_FACTURE } from '@/lib/labels';
import { date, montant, nomComplet, telecharger } from '@/lib/format';
import { useAction, useFiltres } from '@/lib/hooks';
import { D } from '@/lib/routes';

export default function FacturesPage() {
  const navigate = useNavigate();
  const { filtres, page, set, modifier, setPage } = useFiltres({ reference: '', statut: '', devise: '', type: '', impayees: '', echues: '', dateDebut: '', dateFin: '' });
  const stats = useQuery({
    queryKey: ['factures', 'statistiques', filtres],
    queryFn: () => api.get<{ statistiques: StatsFactures }>('/admin/factures/statistiques', filtres).then((r) => r.statistiques),
    placeholderData: keepPreviousData,
  });
  const vue = filtres.echues ? 'echues' : filtres.impayees ? 'impayees' : '';

  const q = useQuery({
    queryKey: ['factures', filtres, page],
    queryFn: () => api.get<Liste<'factures', Facture>>('/admin/factures', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const relances = useAction(() => api.post<{ nbRelances: number }>('/admin/factures/relances'), { invalider: ['factures'] });

  const exporter = async () => {
    try {
      telecharger(await api.blob('/admin/factures/export', filtres), 'factures.csv');
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <div className="stats">
        {stats.data?.parDevise.map((d) => (
          <Stat key={d.devise} icon="file-text" ton="bleu" value={montant(d.montantFacture, d.devise)} label={`Facturé (${d.devise})`}
            hint={`Encaissé ${montant(d.montantEncaisse, d.devise)} · recouvrement ${d.tauxRecouvrement} %`} />
        ))}
        {stats.data?.encoursClients.map((e) => (
          <Stat key={e.devise} icon="alert-triangle" ton="orange" value={montant(e.solde, e.devise)} label={`Encours clients (${e.devise})`}
            onClick={() => set('impayees', 'true')} />
        ))}
      </div>

      <div className="toolbar">
        <SearchInput value={filtres.reference} onChange={(v) => set('reference', v)} placeholder="N° de facture…" />
        <Chips
          options={[{ value: '', label: 'Toutes' }, { value: 'impayees', label: 'Impayées' }, { value: 'echues', label: 'Échues' }]}
          value={vue}
          onChange={(v) => modifier({ impayees: v === 'impayees' ? 'true' : '', echues: v === 'echues' ? 'true' : '' })}
        />
        <select className="select" value={filtres.statut} onChange={(e) => set('statut', e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS_FACTURE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={filtres.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(TYPES_FACTURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input" type="date" title="Émise à partir du" value={filtres.dateDebut} onChange={(e) => set('dateDebut', e.target.value)} />
        <input className="input" type="date" title="Émise jusqu'au" value={filtres.dateFin} onChange={(e) => set('dateFin', e.target.value)} />
        <select className="select" value={filtres.devise} onChange={(e) => set('devise', e.target.value)}>
          <option value="">Toutes devises</option>
          <option value="XOF">FCFA</option>
          <option value="EUR">Euro</option>
        </select>
        <div className="actions" style={{ marginLeft: 'auto' }}>
          <button className="btn secondary" onClick={exporter}><Icon name="download" size={15} /> Export CSV</button>
          <button className="btn secondary" disabled={relances.isPending}
            onClick={() => confirm('Relancer tous les clients dont la facture est échue ?') &&
              relances.mutate(undefined, { onSuccess: (r) => toast.success(`${r.nbRelances} relance(s) envoyée(s)`) })}>
            <Icon name="mail" size={15} /> Relancer les échues
          </button>
        </div>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.factures.length ? <Empty>Aucune facture</Empty> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Facture</th><th>Client</th><th>Colis</th><th className="right">Total</th><th className="right">Payé</th><th>Statut</th><th>Émise le</th><th>Échéance</th></tr>
              </thead>
              <tbody>
                {q.data.factures.map((f) => (
                  <tr key={f.id} className="cliquable" {...ligneCliquable(() => navigate(`${D.facture}/${f.id}`))}>
                    <td className="mono">{f.reference}</td>
                    <td>{f.User?.raisonSociale || nomComplet(f.User)}</td>
                    <td className="mono">{f.colis?.reference ?? '—'}</td>
                    <td className="right">{montant(f.montantTotal, f.devise)}</td>
                    <td className="right">{montant(f.montantPaye, f.devise)}</td>
                    <td><StatutBadge table={STATUTS_FACTURE} valeur={f.statut} /></td>
                    <td className="small muted">{date(f.dateEmission ?? f.createdAt)}</td>
                    <td className="small muted">{date(f.dateLimitePaiement)}</td>
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

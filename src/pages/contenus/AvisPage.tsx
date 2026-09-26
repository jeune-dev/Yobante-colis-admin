import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Liste, Personne } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Card, Chips, Empty, ErrorBox, Loader, Pagination, StatutBadge } from '@/components/ui';
import { STATUTS_AVIS } from '@/lib/labels';
import { dateHeure, nomComplet } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface Avis {
  id: string;
  note: number;
  titre?: string;
  commentaire?: string;
  statut: string;
  motifRejet?: string;
  reponse?: string;
  modereLe?: string;
  createdAt: string;
  client?: Personne;
  colis?: { id: string; reference: string } | null;
}

const Etoiles = ({ note }: { note: number }) => (
  <span style={{ color: '#d49b00', letterSpacing: 1 }} title={`${note} / 5`}>{'★'.repeat(note)}<span style={{ color: '#ddd' }}>{'★'.repeat(5 - note)}</span></span>
);

export default function AvisPage() {
  const invalider = useInvalider();
  const [moderation, setModeration] = useState<Avis | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ statut: 'en_attente', note: '' });

  const q = useQuery({
    queryKey: ['avis', filtres, page],
    queryFn: () => api.get<Liste<'avis', Avis>>('/admin/avis', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const supprimer = useAction((a: Avis) => api.delete(`/admin/avis/${a.id}`), { succes: 'Avis supprimé', invalider: ['avis'] });

  return (
    <>
      <div className="toolbar">
        <Chips
          options={[{ value: 'en_attente', label: 'À modérer' }, { value: 'publie', label: 'Publiés' }, { value: 'rejete', label: 'Rejetés' }, { value: '', label: 'Tous' }]}
          value={filtres.statut}
          onChange={(v) => set('statut', v)}
        />
        <select className="select" value={filtres.note} onChange={(e) => set('note', e.target.value)}>
          <option value="">Toutes les notes</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>)}
        </select>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.avis.length ? <Empty>Aucun avis</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Note</th><th>Avis</th><th>Client</th><th>Colis</th><th>Date</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {q.data.avis.map((a) => (
                  <tr key={a.id}>
                    <td><Etoiles note={a.note} /></td>
                    <td style={{ maxWidth: 420 }}>
                      {a.titre && <strong>{a.titre}<br /></strong>}
                      <span className="small">{a.commentaire || <span className="muted">Sans commentaire</span>}</span>
                      {a.reponse && <div className="small" style={{ marginTop: 4, color: 'var(--primary)' }}>↳ {a.reponse}</div>}
                      {a.motifRejet && <div className="small muted">Rejet : {a.motifRejet}</div>}
                    </td>
                    <td>{a.client ? <Link to={`/clients/${a.client.id}`}>{nomComplet(a.client)}</Link> : '—'}</td>
                    <td className="mono">{a.colis ? <Link to={`/colis/${a.colis.id}`}>{a.colis.reference}</Link> : '—'}</td>
                    <td className="small muted">{dateHeure(a.createdAt)}</td>
                    <td><StatutBadge table={STATUTS_AVIS} valeur={a.statut} /></td>
                    <td>
                      <div className="actions">
                        <button className="btn secondary sm" onClick={() => setModeration(a)}>Modérer</button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm('Supprimer définitivement cet avis ?') && supprimer.mutate(a)}>
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {moderation && (
        <FormModal
          title="Modérer l'avis"
          intro={<div className="small"><Etoiles note={moderation.note} /> {moderation.commentaire}</div>}
          champs={[
            { name: 'statut', label: 'Décision', type: 'select', options: { publie: 'Publier', rejete: 'Rejeter' }, required: true },
            { name: 'motifRejet', label: 'Motif du rejet', required: true, full: true, visible: (v) => v.statut === 'rejete' },
            { name: 'reponse', label: 'Réponse publique de Yobante', type: 'textarea' },
          ]}
          initial={{ statut: moderation.statut === 'rejete' ? 'rejete' : 'publie', reponse: moderation.reponse, motifRejet: moderation.motifRejet }}
          succes="Avis modéré"
          onSubmit={async (corps) => { await api.patch(`/admin/avis/${moderation.id}/moderation`, corps); invalider('avis', 'dashboard'); }}
          onClose={() => setModeration(null)}
        />
      )}
    </>
  );
}

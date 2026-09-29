import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Num, PaginationInfo } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Loader, Modal, Pagination, SearchInput, Stat } from '@/components/ui';
import { date, montant, nomComplet } from '@/lib/format';
import { useFiltres, useInvalider } from '@/lib/hooks';
import { D } from '@/lib/routes';

interface Parrain {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  codeParrainage: string;
  creditParrainage: Num;
  nbFilleuls: Num;
}

interface Reponse {
  parrains: Parrain[];
  totaux: { filleuls: number; creditEnCours: number };
  pagination: PaginationInfo;
}

export default function ParrainagePage() {
  const invalider = useInvalider();
  const [filleuls, setFilleuls] = useState<Parrain | null>(null);
  const [credit, setCredit] = useState<Parrain | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ recherche: '' });

  const q = useQuery({
    queryKey: ['parrainage', filtres, page],
    queryFn: () => api.get<Reponse>('/admin/parrainage', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="stats">
        <Stat icon="users" value={q.data?.totaux.filleuls ?? '—'} label="Filleuls au total" />
        <Stat icon="coins" ton="orange" value={q.data ? montant(q.data.totaux.creditEnCours, 'EUR') : '—'} label="Crédit de parrainage en cours" />
      </div>
      <div className="toolbar">
        <SearchInput value={filtres.recherche} onChange={(v) => set('recherche', v)} placeholder="Nom, email, code…" />
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.parrains.length ? <Empty>Aucun parrain</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Parrain</th><th>Contact</th><th>Code</th><th>Filleuls</th><th className="right">Crédit</th><th /></tr></thead>
              <tbody>
                {q.data.parrains.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`${D.client}/${p.id}`}>{nomComplet(p)}</Link></td>
                    <td className="small">{p.email}<div className="muted">{p.telephone}</div></td>
                    <td className="mono">{p.codeParrainage}</td>
                    <td>{Number(p.nbFilleuls)}</td>
                    <td className="right">{montant(p.creditParrainage, 'EUR')}</td>
                    <td>
                      <div className="actions">
                        <button className="btn secondary sm" onClick={() => setFilleuls(p)}>Filleuls</button>
                        <button className="btn secondary sm" onClick={() => setCredit(p)}><Icon name="coins" size={13} /> Crédit</button>
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

      {filleuls && <DialogueFilleuls parrain={filleuls} onClose={() => setFilleuls(null)} />}
      {credit && (
        <FormModal
          title={`Crédit de ${nomComplet(credit)}`}
          intro={<p className="small">Ajustement manuel (geste commercial, correction). Le montant saisi remplace le crédit actuel.</p>}
          champs={[
            { name: 'creditParrainage', label: 'Nouveau crédit (€)', type: 'number', required: true },
            { name: 'motif', label: 'Motif', full: true },
          ]}
          initial={{ creditParrainage: Number(credit.creditParrainage) }}
          succes="Crédit de parrainage mis à jour"
          onSubmit={async (corps) => { await api.patch(`/admin/parrainage/${credit.id}/credit`, corps); invalider('parrainage'); }}
          onClose={() => setCredit(null)}
        />
      )}
    </>
  );
}

function DialogueFilleuls({ parrain, onClose }: { parrain: Parrain; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['parrainage', parrain.id, 'filleuls'],
    queryFn: () =>
      api.get<{ filleuls: { id: string; nom: string; prenom: string; email: string; createdAt: string; parrainageRecompense: boolean }[] }>(
        `/admin/parrainage/${parrain.id}/filleuls`
      ),
  });
  return (
    <Modal title={`Filleuls de ${nomComplet(parrain)}`} onClose={onClose} large>
      <ErrorBox error={q.error} />
      {q.isLoading ? <Loader /> : q.error ? null : !q.data?.filleuls.length ? <Empty>Aucun filleul</Empty> : (
        <table>
          <thead><tr><th>Filleul</th><th>Email</th><th>Inscrit le</th><th>Récompense</th></tr></thead>
          <tbody>
            {q.data.filleuls.map((f) => (
              <tr key={f.id}>
                <td><Link to={`${D.client}/${f.id}`}>{nomComplet(f)}</Link></td>
                <td className="small">{f.email}</td>
                <td className="small muted">{date(f.createdAt)}</td>
                <td>{f.parrainageRecompense ? <Badge ton="vert">Versée</Badge> : <Badge>En attente</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

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
import ResponsiveTable from '@/components/ResponsiveTable';

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
        {q.isLoading ? <Loader /> : !q.data?.parrains.length ? <Empty>Aucun parrain</Empty> : (
          <ResponsiveTable
            lignes={q.data.parrains}
            cleLigne={(p) => p.id}
            colonnes={[
              { cle: 'parrain', titre: 'Parrain', cellule: (p) => <Link to={`/clients/${p.id}`}>{nomComplet(p)}</Link> },
              { cle: 'contact', titre: 'Contact', className: 'small', cellule: (p) => <>{p.email}<div className="muted">{p.telephone}</div></> },
              { cle: 'code', titre: 'Code', className: 'mono', cellule: (p) => p.codeParrainage },
              { cle: 'filleuls', titre: 'Filleuls', cellule: (p) => Number(p.nbFilleuls) },
              { cle: 'credit', titre: 'Crédit', className: 'right', cellule: (p) => montant(p.creditParrainage, 'EUR') },
              { cle: 'actions', cellule: (p) => (
                <div className="actions">
                  <button className="btn secondary sm" onClick={() => setFilleuls(p)}>Filleuls</button>
                  <button className="btn secondary sm" onClick={() => setCredit(p)}><Icon name="coins" size={13} /> Crédit</button>
                </div>
              ) },
            ]}
          />
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
      {q.isLoading ? <Loader /> : !q.data?.filleuls.length ? <Empty>Aucun filleul</Empty> : (
        <ResponsiveTable
          lignes={q.data.filleuls}
          cleLigne={(f) => f.id}
          colonnes={[
            { cle: 'filleul', titre: 'Filleul', cellule: (f) => <Link to={`/clients/${f.id}`}>{nomComplet(f)}</Link> },
            { cle: 'email', titre: 'Email', mobile: 'soustitre', className: 'small', cellule: (f) => f.email },
            { cle: 'inscrit', titre: 'Inscrit le', className: 'small muted', cellule: (f) => date(f.createdAt) },
            { cle: 'recompense', titre: 'Récompense', mobile: 'badge', cellule: (f) => (f.parrainageRecompense ? <Badge ton="vert">Versée</Badge> : <Badge>En attente</Badge>) },
          ]}
        />
      )}
    </Modal>
  );
}

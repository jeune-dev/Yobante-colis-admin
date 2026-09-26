import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Card, Chips, Empty, ErrorBox, Loader, StatutBadge, toast } from '@/components/ui';
import { STATUTS_SUPPRESSION } from '@/lib/labels';
import { dateHeure } from '@/lib/format';
import { useFiltres, useInvalider } from '@/lib/hooks';

interface Demande {
  id: string;
  email: string;
  motif?: string;
  statut: string;
  traiteLe?: string;
  noteAdmin?: string;
  createdAt: string;
}

export default function SuppressionsComptePage() {
  const invalider = useInvalider();
  const [traitement, setTraitement] = useState<Demande | null>(null);
  const { filtres, set } = useFiltres({ statut: 'en_attente' });

  const q = useQuery({
    queryKey: ['suppressions-compte', filtres],
    queryFn: () => api.get<{ demandes: Demande[] }>('/admin/suppressions-compte', filtres).then((r) => r.demandes),
  });

  return (
    <>
      <div className="alert warn">
        <Icon name="alert-triangle" size={16} />
        <div>Accepter une demande pseudonymise définitivement le compte lié à l'adresse email. Vérifiez d'abord l'identité du demandeur.</div>
      </div>
      <div className="toolbar">
        <Chips
          options={[{ value: 'en_attente', label: 'En attente' }, { value: 'traitee', label: 'Traitées' }, { value: 'rejetee', label: 'Rejetées' }, { value: '', label: 'Toutes' }]}
          value={filtres.statut}
          onChange={(v) => set('statut', v)}
        />
      </div>
      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.length ? <Empty>Aucune demande</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Email</th><th>Motif</th><th>Reçue le</th><th>Statut</th><th>Note</th><th /></tr></thead>
              <tbody>
                {q.data.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.email}</strong></td>
                    <td className="small" style={{ maxWidth: 360 }}>{d.motif || '—'}</td>
                    <td className="small muted">{dateHeure(d.createdAt)}</td>
                    <td><StatutBadge table={STATUTS_SUPPRESSION} valeur={d.statut} />{d.traiteLe && <div className="muted small">{dateHeure(d.traiteLe)}</div>}</td>
                    <td className="small">{d.noteAdmin || '—'}</td>
                    <td>{d.statut === 'en_attente' && <button className="btn secondary sm" onClick={() => setTraitement(d)}>Traiter</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {traitement && (
        <FormModal
          title={`Demande de ${traitement.email}`}
          champs={[
            { name: 'statut', label: 'Décision', type: 'select', required: true, full: true,
              options: { traitee: 'Accepter : supprimer (anonymiser) le compte', rejetee: 'Rejeter la demande' } },
            { name: 'noteAdmin', label: 'Note interne (vérification effectuée, raison du rejet…)', type: 'textarea' },
          ]}
          initial={{ statut: 'rejetee' }}
          succes={false}
          danger
          submitLabel="Confirmer"
          onSubmit={async (corps) => {
            const r = await api.patch<{ compteSupprime: boolean }>(`/admin/suppressions-compte/${traitement.id}`, corps);
            toast.success(corps.statut === 'traitee'
              ? r.compteSupprime ? 'Compte anonymisé' : 'Demande traitée (aucun compte ne correspondait à cet email)'
              : 'Demande rejetée');
            invalider('suppressions-compte');
          }}
          onClose={() => setTraitement(null)}
        />
      )}
    </>
  );
}

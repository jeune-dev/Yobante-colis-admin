import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { FormModal } from '@/components/FormModal';
import { Card, Chips, Empty, ErrorBox, Loader, Pagination, SearchInput, StatutBadge } from '@/components/ui';
import { dateHeure } from '@/lib/format';
import { useFiltres, useInvalider } from '@/lib/hooks';
import type { PaginationInfo } from '@/components/ui';

interface Demande {
  id: string;
  source: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  sujet?: string;
  message: string;
  statut: string;
  objetReponse?: string;
  reponse?: string;
  traiteLe?: string;
  createdAt: string;
}

const STATUTS_DEMANDE_CONTACT = {
  en_attente: { label: 'À traiter', ton: 'orange' as const },
  traitee: { label: 'Répondue', ton: 'vert' as const },
};

const SOURCES: Record<string, string> = { rek: 'Site Yobante Colis', boutique: 'Site Boutique' };

/** Messages laissés sur les formulaires de contact des sites vitrines ; la réponse part par email. */
export default function DemandesContactPage() {
  const invalider = useInvalider();
  const [reponse, setReponse] = useState<Demande | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ statut: 'en_attente', source: '', q: '' });

  const q = useQuery({
    queryKey: ['demandes-contact', filtres, page],
    queryFn: () =>
      api.get<{ demandes: Demande[]; pagination: PaginationInfo }>('/admin/demandes-contact', {
        ...filtres,
        page,
        limit: 20,
      }),
  });

  return (
    <>
      <div className="toolbar">
        <Chips
          options={[{ value: 'en_attente', label: 'À traiter' }, { value: 'traitee', label: 'Répondues' }, { value: '', label: 'Toutes' }]}
          value={filtres.statut}
          onChange={(v) => set('statut', v)}
        />
        <select className="select" value={filtres.source} onChange={(e) => set('source', e.target.value)}>
          <option value="">Tous les sites</option>
          {Object.entries(SOURCES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <SearchInput value={filtres.q} onChange={(v) => set('q', v)} placeholder="Nom, email, message…" />
      </div>
      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.demandes.length ? <Empty>Aucune demande</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Contact</th><th>Site</th><th>Message</th><th>Reçue le</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {q.data.demandes.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.prenom} {d.nom}</strong>
                      <div className="small muted">{d.email}{d.telephone ? ` · ${d.telephone}` : ''}</div>
                    </td>
                    <td className="small">{SOURCES[d.source] ?? d.source}</td>
                    <td className="small" style={{ maxWidth: 420 }}>
                      {d.sujet && <strong>{d.sujet}<br /></strong>}
                      {d.message}
                    </td>
                    <td className="small muted">{dateHeure(d.createdAt)}</td>
                    <td>
                      <StatutBadge table={STATUTS_DEMANDE_CONTACT} valeur={d.statut} />
                      {d.traiteLe && <div className="muted small">{dateHeure(d.traiteLe)}</div>}
                    </td>
                    <td>{d.statut === 'en_attente' && <button className="btn secondary sm" onClick={() => setReponse(d)}>Répondre</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {reponse && (
        <FormModal
          title={`Répondre à ${reponse.prenom} ${reponse.nom}`}
          intro={<p className="small">La réponse est envoyée par email à {reponse.email}.</p>}
          champs={[
            { name: 'objet', label: 'Objet', required: true, full: true },
            { name: 'reponse', label: 'Réponse', type: 'textarea', required: true, full: true },
          ]}
          initial={{ objet: reponse.sujet ? `Re : ${reponse.sujet}` : 'Votre message à Yobante' }}
          submitLabel="Envoyer la réponse"
          succes="Réponse envoyée"
          onSubmit={async (corps) => {
            await api.post(`/admin/demandes-contact/${reponse.id}/traiter`, corps);
            invalider('demandes-contact');
          }}
          onClose={() => setReponse(null)}
        />
      )}
    </>
  );
}

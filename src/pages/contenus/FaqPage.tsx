import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Chips, Empty, ErrorBox, Loader } from '@/components/ui';
import { RUBRIQUES_FAQ, libelle } from '@/lib/labels';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface Question { id: string; question: string; reponse: string; rubrique: string; ordre: number; isActive: boolean }

const CHAMPS: ChampDef[] = [
  { name: 'question', label: 'Question', required: true, full: true },
  { name: 'reponse', label: 'Réponse', type: 'textarea', required: true },
  { name: 'rubrique', label: 'Rubrique', type: 'select', options: RUBRIQUES_FAQ, required: true },
  { name: 'ordre', label: "Ordre d'affichage", type: 'number', step: '1' },
  { name: 'isActive', label: 'Publiée', type: 'checkbox' },
];

export default function FaqPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<Question | 'nouvelle' | null>(null);
  const { filtres, set } = useFiltres({ rubrique: '' });

  const q = useQuery({
    queryKey: ['faq', filtres],
    queryFn: () => api.get<{ questions: Question[] }>('/admin/faq', filtres).then((r) => r.questions),
  });
  const supprimer = useAction((x: Question) => api.delete(`/admin/faq/${x.id}`), { succes: 'Question supprimée', invalider: ['faq'] });
  const toggle = useAction((x: Question) => api.put(`/admin/faq/${x.id}`, { isActive: !x.isActive }), { succes: 'Question mise à jour', invalider: ['faq'] });

  return (
    <>
      <div className="toolbar">
        <Chips
          options={[{ value: '', label: 'Toutes' }, ...Object.entries(RUBRIQUES_FAQ).map(([value, label]) => ({ value, label }))]}
          value={filtres.rubrique}
          onChange={(v) => set('rubrique', v)}
        />
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdition('nouvelle')}>
          <Icon name="plus" size={15} /> Nouvelle question
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.length ? <Empty>Aucune question</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Question</th><th>Rubrique</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.map((x) => (
                  <tr key={x.id}>
                    <td className="muted small">{x.ordre}</td>
                    <td style={{ maxWidth: 560 }}>
                      <strong>{x.question}</strong>
                      <div className="small muted">{x.reponse.length > 180 ? `${x.reponse.slice(0, 180)}…` : x.reponse}</div>
                    </td>
                    <td>{libelle(RUBRIQUES_FAQ, x.rubrique)}</td>
                    <td>{x.isActive ? <Badge ton="vert">Publiée</Badge> : <Badge>Masquée</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(x)}><Icon name="pencil" size={14} /></button>
                        <button className="btn secondary sm" onClick={() => toggle.mutate(x)}>{x.isActive ? 'Masquer' : 'Publier'}</button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm('Supprimer cette question ?') && supprimer.mutate(x)}>
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
      </Card>

      {edition && (
        <FormModal
          large
          title={edition === 'nouvelle' ? 'Nouvelle question' : 'Modifier la question'}
          champs={CHAMPS}
          initial={edition === 'nouvelle' ? { rubrique: filtres.rubrique || 'general', ordre: 0, isActive: true } : (edition as never)}
          succes={edition === 'nouvelle' ? 'Question ajoutée' : 'Question mise à jour'}
          onSubmit={async (corps) => {
            if (edition === 'nouvelle') await api.post('/admin/faq', corps);
            else await api.put(`/admin/faq/${edition.id}`, corps);
            invalider('faq');
          }}
          onClose={() => setEdition(null)}
        />
      )}
    </>
  );
}

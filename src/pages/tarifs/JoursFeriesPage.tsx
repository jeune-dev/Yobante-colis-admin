import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Field, Loader, Modal, toast } from '@/components/ui';
import { OPTIONS_PAYS, PAYS, libelle } from '@/lib/labels';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';

interface JourFerie { id: string; date: string; pays: string; libelle: string; recurrent: boolean }

const CHAMPS: ChampDef[] = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'pays', label: 'Pays', type: 'select', options: OPTIONS_PAYS, required: true },
  { name: 'libelle', label: 'Libellé', required: true, full: true },
  { name: 'recurrent', label: 'Récurrent chaque année (même jour)', type: 'checkbox' },
];

export default function JoursFeriesPage() {
  const invalider = useInvalider();
  const [edition, setEdition] = useState<JourFerie | 'nouveau' | null>(null);
  const [imports, setImports] = useState(false);
  const { filtres, set } = useFiltres({ pays: '', annee: String(new Date().getFullYear()), recurrent: '' });

  const q = useQuery({
    queryKey: ['jours-feries', filtres],
    queryFn: () => api.get<{ joursFeries: JourFerie[] }>('/admin/jours-feries', filtres).then((r) => r.joursFeries),
  });
  const supprimer = useAction((j: JourFerie) => api.delete(`/admin/jours-feries/${j.id}`), { succes: 'Jour férié supprimé', invalider: ['jours-feries'] });

  return (
    <>
      <div className="alert info">
        <Icon name="calendar" size={16} />
        <div>Les jours fériés sont exclus du calcul des délais de livraison (en jours ouvrés).</div>
      </div>
      <div className="toolbar">
        <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
          <option value="">Tous pays</option>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input" type="number" style={{ width: 120 }} value={filtres.annee} onChange={(e) => set('annee', e.target.value)} placeholder="Année" />
        <div className="actions" style={{ marginLeft: 'auto' }}>
          <button className="btn secondary" onClick={() => setImports(true)}><Icon name="download" size={15} /> Importer un calendrier</button>
          <button className="btn" onClick={() => setEdition('nouveau')}><Icon name="plus" size={15} /> Ajouter</button>
        </div>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.length ? <Empty>Aucun jour férié</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Libellé</th><th>Pays</th><th>Récurrence</th><th /></tr></thead>
              <tbody>
                {q.data.map((j) => (
                  <tr key={j.id}>
                    <td>{new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                    <td><strong>{j.libelle}</strong></td>
                    <td>{libelle(PAYS, j.pays)}</td>
                    <td>{j.recurrent ? <Badge ton="bleu">Chaque année</Badge> : <Badge>Ponctuel</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(j)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm(`Supprimer ${j.libelle} ?`) && supprimer.mutate(j)}>
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
          title={edition === 'nouveau' ? 'Nouveau jour férié' : `Modifier ${edition.libelle}`}
          champs={CHAMPS}
          initial={edition === 'nouveau' ? { pays: 'SN', recurrent: false } : (edition as never)}
          succes={edition === 'nouveau' ? 'Jour férié ajouté' : 'Jour férié mis à jour'}
          onSubmit={async (corps) => {
            if (edition === 'nouveau') await api.post('/admin/jours-feries', corps);
            else await api.put(`/admin/jours-feries/${edition.id}`, corps);
            invalider('jours-feries');
          }}
          onClose={() => setEdition(null)}
        />
      )}
      {imports && <DialogueImport onClose={() => setImports(false)} />}
    </>
  );
}

/** Import groupé : une ligne par jour, « AAAA-MM-JJ;Libellé » (le pays est choisi pour tout le lot). */
function DialogueImport({ onClose }: { onClose: () => void }) {
  const invalider = useInvalider();
  const [pays, setPays] = useState('SN');
  const [recurrent, setRecurrent] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const lignes = texte
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [d, ...reste] = l.split(/[;,\t]/);
      return { date: d.trim(), libelle: reste.join(' ').trim() };
    });
  const invalides = lignes.filter((l) => !/^\d{4}-\d{2}-\d{2}$/.test(l.date) || l.libelle.length < 2);

  const importer = async () => {
    if (!lignes.length) return toast.error('Aucune ligne à importer');
    if (invalides.length) return toast.error(`${invalides.length} ligne(s) invalide(s) : format AAAA-MM-JJ;Libellé`);
    setEnvoi(true);
    try {
      const r = await api.post<{ joursFeries: unknown[]; ignores: unknown[] }>('/admin/jours-feries/import', {
        jours: lignes.map((l) => ({ ...l, pays, recurrent })),
      });
      toast.success(`${r.joursFeries.length} importé(s), ${r.ignores.length} déjà présent(s)`);
      invalider('jours-feries');
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal title="Importer un calendrier" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={importer} disabled={envoi}>Importer {lignes.length || ''} jour(s)</button>
      </>
    }>
      <div className="form-row">
        <Field label="Pays">
          <select className="select" value={pays} onChange={(e) => setPays(e.target.value)}>
            {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <label className="check" style={{ alignSelf: 'end' }}>
          <input type="checkbox" checked={recurrent} onChange={(e) => setRecurrent(e.target.checked)} /> Récurrents
        </label>
      </div>
      <Field label="Jours (un par ligne)" hint="Format : AAAA-MM-JJ;Libellé — par ex. 2027-04-04;Fête de l'Indépendance">
        <textarea className="textarea mono" style={{ minHeight: 180 }} value={texte} onChange={(e) => setTexte(e.target.value)} />
      </Field>
      {invalides.length > 0 && <p className="small" style={{ color: 'var(--red)' }}>{invalides.length} ligne(s) invalide(s)</p>}
    </Modal>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Num } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Field, Loader, Modal, toast } from '@/components/ui';
import { ASSIETTES_SURCHARGE, DEVISES, MODES_SURCHARGE, OPTIONS_PAYS, PAYS, TYPES_SURCHARGE, libelle } from '@/lib/labels';
import { montant } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';
import { useServicesOptions } from '@/lib/options';
import ResponsiveTable from '@/components/ResponsiveTable';

interface Surcharge {
  id: string;
  code: string;
  libelle: string;
  type: string;
  mode: string;
  valeur: Num;
  assiette: string;
  devise: string;
  montantMinimum?: Num;
  montantMaximum?: Num;
  serviceId?: string;
  paysApplication?: string;
  automatique: boolean;
  internationalUniquement: boolean;
  soumiseTva: boolean;
  ordreApplication: number;
  isActive: boolean;
}

interface Simulation {
  fret: number;
  lignes: { code: string; libelle: string; mode: string; automatique: boolean; assiette: string; montant: number }[];
  totalSurcharges: number;
  total: number;
}

const valeurAffichee = (s: Surcharge) =>
  s.mode === 'pourcentage' ? `${Number(s.valeur)} %` : s.mode === 'par_kg' ? `${montant(s.valeur, s.devise)}/kg` : montant(s.valeur, s.devise);

export default function SurchargesPage() {
  const invalider = useInvalider();
  const services = useServicesOptions();
  const [edition, setEdition] = useState<Surcharge | 'nouvelle' | null>(null);
  const [simulation, setSimulation] = useState(false);
  const { filtres, set } = useFiltres({ type: '', isActive: '', automatique: '' });

  const q = useQuery({
    queryKey: ['surcharges', filtres],
    queryFn: () => api.get<{ surcharges: Surcharge[] }>('/admin/surcharges', filtres).then((r) => r.surcharges),
  });
  const toggle = useAction((s: Surcharge) => api.patch(`/admin/surcharges/${s.id}/statut`, { isActive: !s.isActive }), {
    succes: 'Surcharge mise à jour',
    invalider: ['surcharges'],
  });
  const supprimer = useAction((s: Surcharge) => api.delete(`/admin/surcharges/${s.id}`), { succes: 'Surcharge supprimée', invalider: ['surcharges'] });

  const champs: ChampDef[] = [
    { name: 'code', label: 'Code', required: true, placeholder: 'FUEL' },
    { name: 'libelle', label: 'Libellé', required: true },
    { name: 'type', label: 'Type', type: 'select', options: TYPES_SURCHARGE, required: true },
    { name: 'mode', label: 'Mode de calcul', type: 'select', options: MODES_SURCHARGE, required: true },
    { name: 'valeur', label: 'Valeur', type: 'number', required: true, hint: '% si pourcentage, montant sinon' },
    { name: 'assiette', label: 'Assiette (pour un %)', type: 'select', options: ASSIETTES_SURCHARGE, required: true },
    { name: 'devise', label: 'Devise', type: 'select', options: DEVISES, required: true },
    { name: 'ordreApplication', label: "Ordre d'application", type: 'number', step: '1' },
    { name: 'montantMinimum', label: 'Montant minimum', type: 'number' },
    { name: 'montantMaximum', label: 'Montant maximum', type: 'number' },
    { name: 'serviceId', label: 'Limité au service', type: 'select', options: services.data ?? [], hint: 'Vide = tous services' },
    { name: 'paysApplication', label: 'Limité au pays', type: 'select', options: OPTIONS_PAYS, hint: 'Vide = les deux pays' },
    { name: 'automatique', label: 'Appliquée automatiquement', type: 'checkbox' },
    { name: 'internationalUniquement', label: 'Envois internationaux uniquement', type: 'checkbox' },
    { name: 'soumiseTva', label: 'Soumise à TVA', type: 'checkbox' },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
  ];

  return (
    <>
      <div className="toolbar">
        <select className="select" value={filtres.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(TYPES_SURCHARGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" value={filtres.automatique} onChange={(e) => set('automatique', e.target.value)}>
          <option value="">Automatiques ou non</option>
          <option value="true">Automatiques</option>
          <option value="false">Optionnelles</option>
        </select>
        <div className="actions pousser">
          <button className="btn secondary" onClick={() => setSimulation(true)}><Icon name="activity" size={15} /> Simuler</button>
          <button className="btn" onClick={() => setEdition('nouvelle')}><Icon name="plus" size={15} /> Nouvelle surcharge</button>
        </div>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.length ? <Empty>Aucune surcharge</Empty> : (
          <ResponsiveTable
            lignes={q.data}
            cleLigne={(s) => s.id}
            colonnes={[
              { cle: 'code', titre: 'Code', className: 'mono', mobile: 'soustitre', cellule: (s) => s.code },
              { cle: 'libelle', titre: 'Libellé', mobile: 'titre', cellule: (s) => <strong>{s.libelle}</strong> },
              { cle: 'type', titre: 'Type', className: 'small', cellule: (s) => libelle(TYPES_SURCHARGE, s.type) },
              { cle: 'valeur', titre: 'Valeur', cellule: (s) => valeurAffichee(s) },
              { cle: 'assiette', titre: 'Assiette', className: 'small', priorite: 'basse', cellule: (s) => libelle(ASSIETTES_SURCHARGE, s.assiette) },
              { cle: 'portee', titre: 'Portée', priorite: 'basse', cellule: (s) => (
                <div className="actions">
                  {s.automatique ? <Badge ton="bleu">Auto</Badge> : <Badge>Option</Badge>}
                  {s.paysApplication && <Badge>{libelle(PAYS, s.paysApplication)}</Badge>}
                  {s.internationalUniquement && <Badge>International</Badge>}
                </div>
              ) },
              { cle: 'etat', titre: 'État', mobile: 'badge', cellule: (s) => (s.isActive ? <Badge ton="vert">Active</Badge> : <Badge>Inactive</Badge>) },
              { cle: 'actions', cellule: (s) => (
                <div className="actions">
                  <button className="btn ghost sm" title="Modifier" aria-label="Modifier" onClick={() => setEdition(s)}><Icon name="pencil" size={14} /></button>
                  <button className="btn secondary sm" onClick={() => toggle.mutate(s)}>{s.isActive ? 'Désactiver' : 'Activer'}</button>
                  <button className="btn ghost sm" title="Supprimer" aria-label="Supprimer" onClick={() => confirm(`Supprimer ${s.libelle} ?`) && supprimer.mutate(s)}>
                    <Icon name="trash-2" size={14} />
                  </button>
                </div>
              ) },
            ]}
          />
        )}
      </Card>

      {edition && (
        <FormModal
          large
          title={edition === 'nouvelle' ? 'Nouvelle surcharge' : `Modifier ${edition.libelle}`}
          champs={champs}
          initial={edition === 'nouvelle'
            ? { mode: 'pourcentage', assiette: 'fret', devise: 'XOF', automatique: true, soumiseTva: true, isActive: true, ordreApplication: 0 }
            : (edition as never)}
          succes={edition === 'nouvelle' ? 'Surcharge créée' : 'Surcharge mise à jour'}
          onSubmit={async (corps) => {
            if (edition === 'nouvelle') await api.post('/admin/surcharges', corps);
            else await api.put(`/admin/surcharges/${edition.id}`, corps);
            invalider('surcharges');
          }}
          onClose={() => setEdition(null)}
        />
      )}
      {simulation && <DialogueSimulation onClose={() => setSimulation(false)} />}
    </>
  );
}

function DialogueSimulation({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ fret: '100', poidsKg: '10', valeurDeclaree: '0' });
  const [resultat, setResultat] = useState<Simulation | null>(null);
  const simuler = async () => {
    try {
      const r = await api.post<{ simulation: Simulation }>('/admin/surcharges/simuler', {
        fret: Number(f.fret), poidsKg: Number(f.poidsKg), valeurDeclaree: Number(f.valeurDeclaree),
      });
      setResultat(r.simulation);
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Modal title="Simuler les surcharges" onClose={onClose} footer={<button className="btn" onClick={simuler}>Simuler</button>}>
      <div className="form-row trois">
        <Field label="Fret"><input className="input" type="number" value={f.fret} onChange={(e) => setF({ ...f, fret: e.target.value })} /></Field>
        <Field label="Poids (kg)"><input className="input" type="number" value={f.poidsKg} onChange={(e) => setF({ ...f, poidsKg: e.target.value })} /></Field>
        <Field label="Valeur déclarée"><input className="input" type="number" value={f.valeurDeclaree} onChange={(e) => setF({ ...f, valeurDeclaree: e.target.value })} /></Field>
      </div>
      {resultat && (
        <ResponsiveTable
          variante="liste"
          sansEntete
          lignes={[
            { cle: 'fret', libelle: <>Fret</>, montant: resultat.fret.toLocaleString('fr-FR') },
            ...resultat.lignes.map((l) => ({ cle: l.code, libelle: <>{l.libelle} {!l.automatique && <Badge>option</Badge>}</>, montant: l.montant.toLocaleString('fr-FR') })),
            { cle: 'total-surcharges', libelle: <span className="muted">Total surcharges</span>, montant: resultat.totalSurcharges.toLocaleString('fr-FR') },
            { cle: 'total', libelle: <strong>Total</strong>, montant: <strong>{resultat.total.toLocaleString('fr-FR')}</strong> },
          ]}
          cleLigne={(l) => l.cle}
          colonnes={[
            { cle: 'libelle', cellule: (l) => l.libelle },
            { cle: 'montant', className: 'right', cellule: (l) => l.montant },
          ]}
        />
      )}
    </Modal>
  );
}

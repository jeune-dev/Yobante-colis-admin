import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, avecVersion } from '@/api/client';
import type { Liste, Num } from '@/api/types';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Badge, Card, Empty, ErrorBox, Field, Loader, Modal, Pagination, toast } from '@/components/ui';
import { DEVISES, OPTIONS_PAYS, PAYS, libelle } from '@/lib/labels';
import { date, montant, poids } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';
import { useServicesOptions, useZonesOptions } from '@/lib/options';

interface Tarif {
  id: string;
  serviceId: string;
  paysDepart: string;
  paysArrivee: string;
  zoneDepartId?: string;
  zoneArriveeId?: string;
  poidsMinKg: Num;
  poidsMaxKg?: Num;
  prixBase: Num;
  poidsInclusKg?: Num;
  prixParKgSupplementaire: Num;
  devise: string;
  montantMinimum: Num;
  dateDebutValidite?: string;
  dateFinValidite?: string;
  isActive: boolean;
  service?: { id: string; code: string; nom: string };
  zoneDepart?: { code: string; nom: string } | null;
  zoneArrivee?: { code: string; nom: string } | null;
}

interface Anomalie { service: string; corridor: string; gravite: string; probleme: string }

const CHAMPS_EDITION: ChampDef[] = [
  { name: 'poidsMinKg', label: 'Poids min (kg)', type: 'number' },
  { name: 'poidsMaxKg', label: 'Poids max (kg)', type: 'number', hint: 'Vide = sans limite' },
  { name: 'prixBase', label: 'Prix de base', type: 'number', required: true },
  { name: 'poidsInclusKg', label: 'Poids inclus (kg)', type: 'number' },
  { name: 'prixParKgSupplementaire', label: 'Prix par kg supplémentaire', type: 'number' },
  { name: 'montantMinimum', label: 'Montant minimum', type: 'number' },
  { name: 'devise', label: 'Devise', type: 'select', options: DEVISES, required: true },
  { name: 'dateDebutValidite', label: 'Valide à partir du', type: 'date' },
  { name: 'dateFinValidite', label: "Valide jusqu'au", type: 'date' },
  { name: 'isActive', label: 'Actif', type: 'checkbox' },
];

export default function TarifsPage() {
  const invalider = useInvalider();
  const services = useServicesOptions();
  const zones = useZonesOptions();
  const [edition, setEdition] = useState<Tarif | 'nouveau' | null>(null);
  const [grille, setGrille] = useState(false);
  const [audit, setAudit] = useState(false);
  const { filtres, page, set, setPage } = useFiltres({ serviceId: '', paysDepart: '', isActive: '', poids: '' });

  const q = useQuery({
    queryKey: ['tarifs', filtres, page],
    queryFn: () => api.get<Liste<'tarifs', Tarif>>('/admin/tarifs', { ...filtres, page, limit: 50 }),
    placeholderData: keepPreviousData,
  });
  const supprimer = useAction((t: Tarif) => api.delete(`/admin/tarifs/${t.id}`), { succes: 'Tarif supprimé', invalider: ['tarifs'] });

  const champsCreation: ChampDef[] = [
    { name: 'serviceId', label: 'Service', type: 'select', options: services.data ?? [], required: true },
    { name: 'paysDepart', label: 'Pays de départ', type: 'select', options: OPTIONS_PAYS, required: true },
    { name: 'paysArrivee', label: "Pays d'arrivée", type: 'select', options: OPTIONS_PAYS, required: true },
    { name: 'zoneDepartId', label: 'Zone de départ', type: 'select', options: zones.data ?? [], hint: 'Vide = tarif national' },
    { name: 'zoneArriveeId', label: "Zone d'arrivée", type: 'select', options: zones.data ?? [], hint: 'Vide = tarif national' },
    ...CHAMPS_EDITION,
  ];

  return (
    <>
      <div className="alert info">
        <Icon name="scale" size={16} />
        <div>Tarif au poids : grille par service × corridor × tranche de poids. Les prix forfaitaires par article sont dans « Grille forfaitaire ».</div>
      </div>
      <div className="toolbar">
        <select className="select" value={filtres.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
          <option value="">Tous services</option>
          {services.data?.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="select" value={filtres.paysDepart} onChange={(e) => set('paysDepart', e.target.value)}>
          <option value="">Tous départs</option>
          {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>Depuis {v}</option>)}
        </select>
        <input className="input" type="number" min="0" style={{ width: 150 }} placeholder="Poids (kg)" value={filtres.poids} onChange={(e) => set('poids', e.target.value)} />
        <div className="actions" style={{ marginLeft: 'auto' }}>
          <button className="btn secondary" onClick={() => setAudit(true)}><Icon name="check-circle" size={15} /> Audit de la grille</button>
          <button className="btn secondary" onClick={() => setGrille(true)}><Icon name="grid" size={15} /> Créer une grille</button>
          <button className="btn" onClick={() => setEdition('nouveau')}><Icon name="plus" size={15} /> Nouvelle tranche</button>
        </div>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : q.error ? null : !q.data?.tarifs.length ? <Empty>Aucun tarif</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Service</th><th>Corridor</th><th>Tranche</th><th className="right">Prix de base</th><th className="right">€/kg sup.</th><th className="right">Minimum</th><th>Validité</th><th>État</th><th /></tr></thead>
              <tbody>
                {q.data.tarifs.map((t) => (
                  <tr key={t.id}>
                    <td>{t.service?.nom ?? '—'}</td>
                    <td className="small">
                      {libelle(PAYS, t.paysDepart)}{t.zoneDepart && ` (${t.zoneDepart.code})`} → {libelle(PAYS, t.paysArrivee)}{t.zoneArrivee && ` (${t.zoneArrivee.code})`}
                    </td>
                    <td className="small">{poids(t.poidsMinKg)} → {t.poidsMaxKg != null ? poids(t.poidsMaxKg) : '∞'}{t.poidsInclusKg != null && <div className="muted">{poids(t.poidsInclusKg)} inclus</div>}</td>
                    <td className="right">{montant(t.prixBase, t.devise)}</td>
                    <td className="right">{montant(t.prixParKgSupplementaire, t.devise)}</td>
                    <td className="right">{montant(t.montantMinimum, t.devise)}</td>
                    <td className="small">{t.dateDebutValidite || t.dateFinValidite ? `${date(t.dateDebutValidite)} → ${date(t.dateFinValidite)}` : 'Permanente'}</td>
                    <td>{t.isActive ? <Badge ton="vert">Actif</Badge> : <Badge>Inactif</Badge>}</td>
                    <td>
                      <div className="actions">
                        <button className="btn ghost sm" title="Modifier" onClick={() => setEdition(t)}><Icon name="pencil" size={14} /></button>
                        <button className="btn ghost sm" title="Supprimer" onClick={() => confirm('Supprimer cette tranche ?') && supprimer.mutate(t)}>
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

      {edition && (
        <FormModal
          large
          title={edition === 'nouveau' ? 'Nouvelle tranche tarifaire' : 'Modifier la tranche'}
          champs={edition === 'nouveau' ? champsCreation : CHAMPS_EDITION}
          initial={edition === 'nouveau' ? { paysDepart: 'FR', paysArrivee: 'SN', devise: 'EUR', poidsMinKg: 0, prixParKgSupplementaire: 0, montantMinimum: 0, isActive: true } : (edition as never)}
          succes={edition === 'nouveau' ? 'Tarif créé' : 'Tarif mis à jour'}
          onSubmit={async (corps, { version }) => {
            if (edition === 'nouveau') await api.post('/admin/tarifs', corps);
            else await api.put(`/admin/tarifs/${edition.id}`, corps, avecVersion(version));
            invalider('tarifs');
          }}
          onClose={() => setEdition(null)}
        />
      )}
      {grille && <DialogueGrille services={services.data ?? []} zones={zones.data ?? []} onClose={() => setGrille(false)} />}
      {audit && <DialogueAudit onClose={() => setAudit(false)} />}
    </>
  );
}

type Opt = { value: string; label: string };
interface Tranche { poidsMinKg: string; poidsMaxKg: string; prixBase: string; poidsInclusKg: string; prixParKgSupplementaire: string; montantMinimum: string }
const trancheVide = (min = ''): Tranche => ({ poidsMinKg: min, poidsMaxKg: '', prixBase: '', poidsInclusKg: '', prixParKgSupplementaire: '', montantMinimum: '' });

function DialogueGrille({ services, zones, onClose }: { services: Opt[]; zones: Opt[]; onClose: () => void }) {
  const invalider = useInvalider();
  const [entete, setEntete] = useState({ serviceId: '', paysDepart: 'FR', paysArrivee: 'SN', zoneDepartId: '', zoneArriveeId: '', devise: 'EUR' });
  const [tranches, setTranches] = useState<Tranche[]>([trancheVide('0')]);
  const [envoi, setEnvoi] = useState(false);

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
  const creer = async () => {
    if (!entete.serviceId) return toast.error('Choisissez un service');
    if (tranches.some((t) => t.poidsMinKg === '' || t.prixBase === '')) return toast.error('Chaque tranche doit avoir un poids min et un prix de base');
    setEnvoi(true);
    try {
      await api.post('/admin/tarifs/grille', {
        ...entete,
        zoneDepartId: entete.zoneDepartId || null,
        zoneArriveeId: entete.zoneArriveeId || null,
        tranches: tranches.map((t) => ({
          poidsMinKg: Number(t.poidsMinKg),
          poidsMaxKg: num(t.poidsMaxKg) ?? null,
          prixBase: Number(t.prixBase),
          poidsInclusKg: num(t.poidsInclusKg) ?? null,
          prixParKgSupplementaire: num(t.prixParKgSupplementaire),
          montantMinimum: num(t.montantMinimum),
        })),
      });
      toast.success(`Grille de ${tranches.length} tranche(s) créée`);
      invalider('tarifs');
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };

  const col = (k: keyof Tranche, i: number) => (
    <input className="input" type="number" min="0" value={tranches[i][k]}
      onChange={(e) => setTranches(tranches.map((t, j) => (j === i ? { ...t, [k]: e.target.value } : t)))} />
  );

  return (
    <Modal large title="Créer une grille complète" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={creer} disabled={envoi}>Créer {tranches.length} tranche(s)</button>
      </>
    }>
      <p className="small muted" style={{ marginBottom: 12 }}>Toutes les tranches sont créées ensemble ; une seule ligne en conflit annule l'import.</p>
      <div className="form-row">
        <Field label="Service *">
          <select className="select" value={entete.serviceId} onChange={(e) => setEntete({ ...entete, serviceId: e.target.value })}>
            <option value="">— Choisir —</option>
            {services.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Devise">
          <select className="select" value={entete.devise} onChange={(e) => setEntete({ ...entete, devise: e.target.value })}>
            {Object.entries(DEVISES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Départ">
          <select className="select" value={entete.paysDepart} onChange={(e) => setEntete({ ...entete, paysDepart: e.target.value })}>
            {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Arrivée">
          <select className="select" value={entete.paysArrivee} onChange={(e) => setEntete({ ...entete, paysArrivee: e.target.value })}>
            {Object.entries(OPTIONS_PAYS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Zone de départ">
          <select className="select" value={entete.zoneDepartId} onChange={(e) => setEntete({ ...entete, zoneDepartId: e.target.value })}>
            <option value="">Nationale</option>
            {zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
          </select>
        </Field>
        <Field label="Zone d'arrivée">
          <select className="select" value={entete.zoneArriveeId} onChange={(e) => setEntete({ ...entete, zoneArriveeId: e.target.value })}>
            <option value="">Nationale</option>
            {zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
          </select>
        </Field>
      </div>
      <table>
        <thead><tr><th>Poids min</th><th>Poids max</th><th>Prix base</th><th>Kg inclus</th><th>Prix/kg sup.</th><th>Minimum</th><th /></tr></thead>
        <tbody>
          {tranches.map((_, i) => (
            <tr key={i}>
              <td>{col('poidsMinKg', i)}</td><td>{col('poidsMaxKg', i)}</td><td>{col('prixBase', i)}</td>
              <td>{col('poidsInclusKg', i)}</td><td>{col('prixParKgSupplementaire', i)}</td><td>{col('montantMinimum', i)}</td>
              <td><button className="btn ghost sm" onClick={() => setTranches(tranches.filter((__, j) => j !== i))} disabled={tranches.length === 1}><Icon name="x" size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn secondary sm" style={{ marginTop: 8 }}
        onClick={() => setTranches([...tranches, trancheVide(tranches[tranches.length - 1]?.poidsMaxKg ?? '')])}>
        <Icon name="plus" size={13} /> Ajouter une tranche
      </button>
    </Modal>
  );
}

function DialogueAudit({ onClose }: { onClose: () => void }) {
  const q = useQuery({
    queryKey: ['tarifs', 'audit'],
    queryFn: () => api.get<{ conforme: boolean; anomalies: Anomalie[] }>('/admin/tarifs/audit'),
  });
  return (
    <Modal large title="Audit de la grille tarifaire" onClose={onClose}>
      <ErrorBox error={q.error} />
      {q.isLoading ? <Loader /> : q.data?.conforme ? (
        <div className="alert info"><Icon name="check-circle" size={16} /><div>Grille conforme : chaque service actif couvre tous ses corridors.</div></div>
      ) : (
        <table>
          <thead><tr><th>Service</th><th>Corridor</th><th>Gravité</th><th>Problème</th></tr></thead>
          <tbody>
            {q.data?.anomalies.map((a, i) => (
              <tr key={i}>
                <td>{a.service}</td>
                <td className="small">{a.corridor}</td>
                <td><Badge ton={a.gravite === 'bloquante' ? 'rouge' : 'orange'}>{a.gravite}</Badge></td>
                <td className="small">{a.probleme}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

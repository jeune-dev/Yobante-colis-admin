import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Client, Liste, PointRef } from '@/api/types';
import Icon from '@/components/Icon';
import { Badge, Card, Empty, ErrorBox, Field, Loader, Modal, Pagination, SearchInput, toast } from '@/components/ui';
import { PAYS, ROLES, libelle } from '@/lib/labels';
import { dateHeure, nomComplet } from '@/lib/format';
import { useAction, useFiltres, useInvalider } from '@/lib/hooks';
import { FormModal } from '@/components/FormModal';

type Membre = Client & { pointAffectation?: PointRef };

export default function PersonnelPage() {
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<Membre | null>(null);
  const { filtres, page, set, setPage } = useFiltres({ search: '', role: '', pays: '' });

  const q = useQuery({
    queryKey: ['personnel', filtres, page],
    queryFn: () => api.get<Liste<'personnel', Membre>>('/admin/personnel', { ...filtres, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const statut = useAction(
    ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/admin/personnel/${id}/statut`, { isActive }),
    { succes: 'Compte mis à jour', invalider: ['personnel'] }
  );

  return (
    <>
      <div className="toolbar">
        <SearchInput value={filtres.search} onChange={(v) => set('search', v)} placeholder="Nom, email, téléphone…" />
        <select className="select" value={filtres.role} onChange={(e) => set('role', e.target.value)}>
          <option value="">Tous les rôles</option>
          <option value="coursier">Coursiers</option>
          <option value="agent_point">Agents de point</option>
        </select>
        <select className="select" value={filtres.pays} onChange={(e) => set('pays', e.target.value)}>
          <option value="">Tous pays</option>
          <option value="FR">France</option>
          <option value="SN">Sénégal</option>
        </select>
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setCreation(true)}>
          <Icon name="plus" size={15} /> Ajouter un membre
        </button>
      </div>

      <ErrorBox error={q.error} />
      <Card flush>
        {q.isLoading ? <Loader /> : !q.data?.personnel.length ? <Empty>Aucun membre du personnel</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nom</th><th>Rôle</th><th>Contact</th><th>Pays</th><th>Point</th><th>Dernière connexion</th><th>État</th></tr></thead>
              <tbody>
                {q.data.personnel.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{nomComplet(m)}</strong></td>
                    <td><Badge ton={m.role === 'coursier' ? 'cyan' : 'violet'}>{libelle(ROLES, m.role)}</Badge></td>
                    <td className="small">{m.email}<div className="muted">{m.telephone}</div></td>
                    <td>{libelle(PAYS, m.pays)}</td>
                    <td className="small">
                      {m.pointAffectation?.nom
                        ?? (m.role === 'agent_point'
                          ? <span title="Sans point de rattachement, cet agent ne voit aucun colis"><Badge ton="rouge">Aucun point</Badge></span>
                          : '—')}
                    </td>
                    <td className="small muted">{dateHeure(m.lastLoginAt)}</td>
                    <td>
                      <button className="btn ghost sm" onClick={() => setEdition(m)} title="Modifier"><Icon name="pencil" size={14} /></button>{' '}
                      <button className={`btn sm ${m.isActive ? 'secondary' : 'danger'}`}
                        onClick={() => statut.mutate({ id: m.id, isActive: !m.isActive })}>
                        {m.isActive ? 'Actif' : 'Désactivé'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination info={q.data?.pagination} onPage={setPage} />
      </Card>

      {creation && <DialogueCreation onClose={() => setCreation(false)} />}
      {edition && <DialogueEdition membre={edition} onClose={() => setEdition(null)} />}
    </>
  );
}

function DialogueCreation({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ nom: '', prenom: '', email: '', telephone: '', password: '', role: 'coursier', pays: 'SN', pointCollecteId: '' });
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const points = useQuery({
    queryKey: ['points-collecte', 'options', f.pays],
    queryFn: () => api.get<{ points: PointRef[] }>('/admin/points-collecte', { pays: f.pays, limit: 100 }).then((r) => r.points),
    enabled: f.role === 'agent_point',
  });
  const a = useAction(
    () => api.post('/admin/personnel', { ...f, pointCollecteId: f.role === 'agent_point' ? f.pointCollecteId : undefined }),
    { succes: 'Membre ajouté', invalider: ['personnel'] }
  );
  const valider = () => {
    if (!f.nom || !f.prenom || !f.email || !f.telephone || !f.password) return toast.error('Tous les champs sont obligatoires');
    if (f.role === 'agent_point' && !f.pointCollecteId) return toast.error('Choisissez le point de rattachement');
    a.mutate(undefined, { onSuccess: onClose });
  };

  return (
    <Modal title="Ajouter un membre du personnel" onClose={onClose} footer={
      <>
        <button className="btn secondary" onClick={onClose}>Annuler</button>
        <button className="btn" onClick={valider} disabled={a.isPending}>Créer le compte</button>
      </>
    }>
      <div className="form-row">
        <Field label="Prénom"><input className="input" value={f.prenom} onChange={maj('prenom')} /></Field>
        <Field label="Nom"><input className="input" value={f.nom} onChange={maj('nom')} /></Field>
        <Field label="Email"><input className="input" type="email" value={f.email} onChange={maj('email')} /></Field>
        <Field label="Téléphone"><input className="input" value={f.telephone} onChange={maj('telephone')} placeholder="+221…" /></Field>
        <Field label="Rôle">
          <select className="select" value={f.role} onChange={maj('role')}>
            <option value="coursier">Coursier</option>
            <option value="agent_point">Agent de point</option>
          </select>
        </Field>
        <Field label="Pays">
          <select className="select" value={f.pays} onChange={maj('pays')}>
            <option value="SN">Sénégal</option>
            <option value="FR">France</option>
          </select>
        </Field>
      </div>
      {f.role === 'agent_point' && (
        <Field label="Point de collecte">
          <select className="select" value={f.pointCollecteId} onChange={maj('pointCollecteId')}>
            <option value="">— Choisir —</option>
            {points.data?.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.nom}</option>)}
          </select>
        </Field>
      )}
      <Field label="Mot de passe provisoire" hint="8 caractères min., une majuscule, un chiffre et un caractère spécial.">
        <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={maj('password')} />
      </Field>
    </Modal>
  );
}

function DialogueEdition({ membre, onClose }: { membre: Membre; onClose: () => void }) {
  const invalider = useInvalider();
  const points = useQuery({
    queryKey: ['points-collecte', 'options', membre.pays],
    queryFn: () => api.get<{ points: PointRef[] }>('/admin/points-collecte', { pays: membre.pays, limit: 100 }).then((r) => r.points),
    enabled: membre.role === 'agent_point',
  });
  if (membre.role === 'agent_point' && points.isLoading) return null;
  return (
    <FormModal
      title={`Modifier ${nomComplet(membre)}`}
      champs={[
        { name: 'prenom', label: 'Prénom' },
        { name: 'nom', label: 'Nom' },
        { name: 'telephone', label: 'Téléphone', type: 'tel' },
        { name: 'pays', label: 'Pays', type: 'select', options: PAYS, required: true },
        {
          name: 'pointCollecteId', label: 'Point de collecte', type: 'select', full: true,
          options: (points.data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.nom}` })),
          visible: () => membre.role === 'agent_point',
          // Sans point, l'agent ne voit aucun colis : le rattachement est obligatoire
          required: membre.role === 'agent_point',
          hint: membre.role === 'agent_point' && !points.data?.length
            ? `Aucun point de collecte en ${libelle(PAYS, membre.pays)} : créez-en un dans Réseau.`
            : undefined,
        },
      ]}
      initial={{ ...membre, pointCollecteId: membre.pointAffectation?.id ?? (membre as { pointCollecteId?: string }).pointCollecteId }}
      succes="Compte mis à jour"
      onSubmit={async (corps) => { await api.put(`/admin/personnel/${membre.id}`, corps); invalider('personnel'); }}
      onClose={onClose}
    />
  );
}

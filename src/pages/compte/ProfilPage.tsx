import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { Client } from '@/api/types';
import { useAuth, type Utilisateur } from '@/auth/store';
import Icon from '@/components/Icon';
import { FormModal } from '@/components/FormModal';
import { Card, ErrorBox, KV, Loader, toast } from '@/components/ui';
import { PAYS, ROLES, libelle } from '@/lib/labels';
import { dateHeure, initiales, nomComplet } from '@/lib/format';
import { useInvalider } from '@/lib/hooks';

type Profil = Client & {
  avatarUrl?: string;
  notificationsEmail: boolean;
  notificationsSms: boolean;
  notificationsWhatsapp: boolean;
  notificationsPush: boolean;
};

const PREFERENCES = [
  { cle: 'notificationsEmail', label: 'Email' },
  { cle: 'notificationsSms', label: 'SMS' },
  { cle: 'notificationsWhatsapp', label: 'WhatsApp' },
  { cle: 'notificationsPush', label: 'Notifications push' },
] as const;

const REGLE_MDP = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}$/;

export default function ProfilPage() {
  const navigate = useNavigate();
  const invalider = useInvalider();
  const { setSession, accessToken, clear } = useAuth();
  const [dialogue, setDialogue] = useState<null | 'profil' | 'avatar' | 'mdp'>(null);

  const q = useQuery({
    queryKey: ['profil'],
    queryFn: () => api.get<{ utilisateur: Profil }>('/client/profil').then((r) => r.utilisateur),
  });

  // Garde l'identité affichée dans la barre latérale à jour
  const synchroniser = (u: Profil) => accessToken && setSession(accessToken, undefined, u as Utilisateur);

  const basculer = async (cle: (typeof PREFERENCES)[number]['cle'], valeur: boolean) => {
    try {
      const r = await api.put<{ utilisateur: Profil }>('/client/profil/preferences', { [cle]: valeur });
      synchroniser(r.utilisateur);
      invalider('profil');
    } catch (e) {
      toast.error(e);
    }
  };

  if (q.isLoading) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} />;
  const u = q.data!;

  return (
    <>
      {/* Carte d'identité : bandeau dégradé bleu derrière l'avatar, comme la page de connexion */}
      <section className="profil-carte" aria-labelledby="profil-nom">
        <div className="profil-banniere" />
        <div className="profil-identite">
          <span className="profil-avatar">
            {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : <span className="profil-initiales">{initiales(u)}</span>}
          </span>
          <h1 id="profil-nom" className="profil-nom">{nomComplet(u)}</h1>
          <p className="profil-role">{libelle(ROLES, u.role)}</p>
          <p className="profil-email">{u.email}</p>
          <div className="profil-actions">
            <button className="btn secondary" onClick={() => setDialogue('profil')}><Icon name="pencil" size={15} /> Modifier</button>
            <button className="btn secondary" onClick={() => setDialogue('avatar')}><Icon name="image" size={15} /> Photo</button>
            <button className="btn secondary" onClick={() => setDialogue('mdp')}><Icon name="lock" size={15} /> Mot de passe</button>
          </div>
        </div>
      </section>

      <div className="grid grid-2">
        <Card title="Informations">
          <div className="kv">
            <KV label="Email">{u.email}</KV>
            <KV label="Téléphone">{u.telephone}</KV>
            <KV label="Pays">{libelle(PAYS, u.pays)}</KV>
            <KV label="Adresse">{u.adresse || '—'}</KV>
            <KV label="Dernière connexion">{dateHeure(u.lastLoginAt)}</KV>
            <KV label="Compte créé le">{dateHeure(u.createdAt)}</KV>
          </div>
        </Card>
        <Card title="Mes notifications">
          <p className="small muted profil-intro">Canaux par lesquels vous recevez les alertes (délais d'étude dépassés, nouvelles demandes…).</p>
          <div className="profil-preferences">
            {PREFERENCES.map((p) => (
              <label key={p.cle} className="profil-preference">
                <span>{p.label}</span>
                {/* Case à cocher native, présentée en interrupteur */}
                <input type="checkbox" role="switch" className="interrupteur" checked={!!u[p.cle]}
                  onChange={(e) => basculer(p.cle, e.target.checked)} />
              </label>
            ))}
          </div>
        </Card>
      </div>

      {dialogue === 'profil' && (
        <FormModal
          title="Modifier mon profil"
          champs={[
            { name: 'prenom', label: 'Prénom' },
            { name: 'nom', label: 'Nom' },
            { name: 'telephone', label: 'Téléphone', type: 'tel' },
            { name: 'codePostal', label: 'Code postal' },
            { name: 'adresse', label: 'Adresse', full: true },
          ]}
          initial={u as never}
          succes="Profil mis à jour"
          onSubmit={async (corps) => {
            const r = await api.put<{ utilisateur: Profil }>('/client/profil', corps);
            synchroniser(r.utilisateur);
            invalider('profil');
          }}
          onClose={() => setDialogue(null)}
        />
      )}
      {dialogue === 'avatar' && (
        <FormModal
          title="Photo de profil"
          champs={[{ name: 'avatar', label: 'Photo (JPEG ou PNG, 5 Mo max.)', type: 'file', accept: 'image/jpeg,image/png', required: true, full: true }]}
          submitLabel="Téléverser"
          succes="Photo mise à jour"
          onSubmit={async (corps) => {
            const r = await api.upload<{ utilisateur: Profil }>('/client/profil/avatar', corps);
            synchroniser(r.utilisateur);
            invalider('profil');
          }}
          onClose={() => setDialogue(null)}
        />
      )}
      {dialogue === 'mdp' && (
        <FormModal
          title="Changer de mot de passe"
          intro={<p className="small">Tous vos jetons de connexion seront révoqués : vous devrez vous reconnecter.</p>}
          champs={[
            { name: 'oldPassword', label: 'Mot de passe actuel', type: 'password', required: true, full: true },
            { name: 'newPassword', label: 'Nouveau mot de passe', type: 'password', required: true, full: true,
              hint: '8 caractères min., une majuscule, un chiffre et un caractère spécial.' },
            { name: 'confirmation', label: 'Confirmer le nouveau mot de passe', type: 'password', required: true, full: true },
          ]}
          succes={false}
          onSubmit={async (corps) => {
            if (corps.newPassword !== corps.confirmation) throw new Error('Les deux mots de passe ne correspondent pas');
            if (!REGLE_MDP.test(String(corps.newPassword))) throw new Error('Le nouveau mot de passe ne respecte pas les règles');
            await api.put('/auth/change-password', { oldPassword: corps.oldPassword, newPassword: corps.newPassword });
            toast.success('Mot de passe modifié : reconnectez-vous');
            clear();
            navigate('/login');
          }}
          onClose={() => setDialogue(null)}
        />
      )}
    </>
  );
}

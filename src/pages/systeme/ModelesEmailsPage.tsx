import { Fragment, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import Icon from '@/components/Icon';
import { Badge, Confirmation, Empty, ErrorBox, Loader, Modal, toast } from '@/components/ui';
import { EditeurContenu, EditeurObjet, type EditeurRef } from '@/components/EditeurEmail';
import { dateHeure } from '@/lib/format';
import { useInvalider } from '@/lib/hooks';

interface Modele {
  code: string;
  description?: string;
  variables: string[];
  personnalise: boolean;
  isActive: boolean;
  sujet: string;
  corpsHtml: string;
  sujetParDefaut: string;
  corpsParDefaut: string;
  modifieLe?: string | null;
}

/** Libellés lisibles des variables : l'admin voit « Prénom », pas `{{prenom}}`. */
const LIBELLES_VARIABLES: Record<string, string> = {
  prenom: 'Prénom',
  nom: 'Nom',
  code: 'Code',
  duree: 'Durée',
  reference: 'Référence',
  categorie: 'Catégorie',
  delaiEtude: "Délai d'étude",
  lien: 'Lien',
  montant: 'Montant',
  instructions: 'Instructions',
  motif: 'Motif',
  commentaire: 'Commentaire',
  dateExpiration: "Date d'expiration",
  conditions: 'Conditions',
  facture: 'Facture',
  dateLimite: 'Date limite',
  titre: 'Titre',
  date: 'Date',
  horaires: 'Horaires',
  zone: 'Zone',
  message: 'Message',
};

const libelleVariable = (v: string) => LIBELLES_VARIABLES[v] ?? v;

/** Texte dont les variables `{{x}}` sont affichées en pastilles lisibles. */
function TexteAvecVariables({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/(\{\{\s*\w+\s*\}\})/g).map((morceau, i) => {
        const v = /^\{\{\s*(\w+)\s*\}\}$/.exec(morceau)?.[1];
        return v ? (
          <span key={i} className="variable-pastille" title={`{{${v}}}`}>
            {libelleVariable(v)}
          </span>
        ) : (
          <Fragment key={i}>{morceau}</Fragment>
        );
      })}
    </>
  );
}

export default function ModelesEmailsPage() {
  const [edition, setEdition] = useState<Modele | null>(null);
  const q = useQuery({
    queryKey: ['modeles-emails'],
    queryFn: () => api.get<{ modeles: Modele[] }>('/admin/modeles-emails').then((r) => r.modeles),
  });

  return (
    <>
      <div className="alert info">
        <Icon name="mail" size={16} />
        <div>
          Chaque email envoyé aux clients part d'un de ces modèles. Les éléments en jaune (prénom, référence…) sont
          remplacés automatiquement à l'envoi par les informations du client.
        </div>
      </div>
      <ErrorBox error={q.error} />
      {q.isLoading ? (
        <Loader />
      ) : !q.data?.length ? (
        <div className="card">
          <Empty>Aucun modèle</Empty>
        </div>
      ) : (
        <div className="modeles-grille">
          {q.data.map((m) => (
            <button key={m.code} type="button" className="modele-carte" onClick={() => setEdition(m)}>
              <div className="modele-carte-tete">
                <span className="modele-icone">
                  <Icon name="mail" size={18} />
                </span>
                <span className="modele-titres">
                  <span className="modele-titre">{m.description || m.code}</span>
                  <span className="modele-code">{m.code}</span>
                </span>
                <span className="modele-badges">
                  {m.personnalise ? <Badge ton="violet">Personnalisé</Badge> : <Badge>Par défaut</Badge>}
                  {!m.isActive && <Badge ton="rouge">Désactivé</Badge>}
                </span>
              </div>
              <div className="modele-objet">
                <span className="modele-objet-libelle">Objet</span>
                <span className="modele-objet-texte">
                  <TexteAvecVariables texte={m.sujet} />
                </span>
              </div>
              <div className="modele-carte-pied">
                <span>
                  {m.variables.length} variable{m.variables.length > 1 ? 's' : ''}
                  {m.modifieLe && <> · modifié le {dateHeure(m.modifieLe)}</>}
                </span>
                <span className="modele-modifier">
                  Modifier <Icon name="arrow-right" size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      {edition && <DialogueModele modele={edition} onClose={() => setEdition(null)} />}
    </>
  );
}

function DialogueModele({ modele, onClose }: { modele: Modele; onClose: () => void }) {
  const invalider = useInvalider();
  const [sujet, setSujet] = useState(modele.sujet);
  const [corpsHtml, setCorps] = useState(modele.corpsHtml);
  const [isActive, setActive] = useState(modele.isActive);
  const [apercu, setApercu] = useState<string | null>(null);
  const [apercuEnCours, setApercuEnCours] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [confirmerReinit, setConfirmerReinit] = useState(false);
  // Champ où insérer une variable : le dernier qui a eu le focus (le contenu par défaut)
  const cible = useRef<'sujet' | 'corps'>('corps');
  const refSujet = useRef<EditeurRef>(null);
  const refCorps = useRef<EditeurRef>(null);

  // Aperçu mis à jour automatiquement, une fois la saisie terminée
  useEffect(() => {
    let annule = false;
    const minuterie = setTimeout(async () => {
      setApercuEnCours(true);
      try {
        const html = await api.postHtml(`/admin/modeles-emails/${modele.code}/apercu`, { sujet, corpsHtml });
        if (!annule) setApercu(html);
      } catch (e) {
        if (!annule) toast.error(e);
      } finally {
        if (!annule) setApercuEnCours(false);
      }
    }, 600);
    return () => {
      annule = true;
      clearTimeout(minuterie);
    };
  }, [modele.code, sujet, corpsHtml]);

  // Insère la variable à l'emplacement du curseur, dans le dernier champ utilisé
  const inserer = (v: string) => (cible.current === 'sujet' ? refSujet : refCorps).current?.inserer(v);

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await api.put(`/admin/modeles-emails/${modele.code}`, { sujet, corpsHtml, isActive });
      toast.success('Modèle enregistré');
      invalider('modeles-emails');
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };
  const reinitialiser = async () => {
    try {
      await api.delete(`/admin/modeles-emails/${modele.code}`);
      toast.success('Modèle par défaut rétabli');
      invalider('modeles-emails');
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Modal
      large="xl"
      title={modele.description || modele.code}
      onClose={onClose}
      footer={
        <>
          {modele.personnalise && (
            <button className="btn danger-doux pousser-gauche" onClick={() => setConfirmerReinit(true)}>
              <Icon name="refresh-cw" size={14} /> Rétablir le modèle par défaut
            </button>
          )}
          <button className="btn secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn" onClick={enregistrer} disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <div className="editeur-email">
        <div className="editeur-email-saisie">
          <div className="editeur-ligne-code">
            <span className="modele-code">{modele.code}</span>
            {modele.personnalise ? <Badge ton="violet">Personnalisé</Badge> : <Badge>Par défaut</Badge>}
          </div>

          <div className="field">
            <label id="modele-sujet-libelle">Objet de l'email</label>
            <EditeurObjet
              id="modele-sujet"
              ref={refSujet}
              valeur={sujet}
              libelle={libelleVariable}
              onFocus={() => (cible.current = 'sujet')}
              onChange={setSujet}
            />
          </div>

          <div className="field">
            <label>Insérer une information</label>
            <div className="variables-liste">
              {modele.variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="variable-bouton"
                  title={`{{${v}}}`}
                  aria-label={`Insérer ${libelleVariable(v)}`}
                  onClick={() => inserer(v)}
                >
                  <Icon name="plus" size={12} />
                  {libelleVariable(v)}
                </button>
              ))}
            </div>
            <span className="hint">S'ajoute là où se trouve le curseur, dans l'objet ou dans le contenu.</span>
          </div>

          <div className="field">
            <label id="modele-corps-libelle">Contenu de l'email</label>
            <EditeurContenu
              id="modele-corps"
              ref={refCorps}
              valeur={corpsHtml}
              libelle={libelleVariable}
              onFocus={() => (cible.current = 'corps')}
              onChange={setCorps}
            />
          </div>

          <label className="editeur-activation">
            <span>
              <span className="editeur-activation-titre">Envoi activé</span>
              <span className="editeur-activation-aide">
                {isActive ? 'Cet email est envoyé aux clients.' : "Cet email n'est plus envoyé."}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="interrupteur"
              checked={isActive}
              onChange={(e) => setActive(e.target.checked)}
            />
          </label>
        </div>

        <div className="editeur-email-apercu">
          <div className="apercu-entete">
            <span className="apercu-titre">
              <Icon name="eye" size={15} /> Aperçu
            </span>
            <span className="apercu-etat">{apercuEnCours ? 'Mise à jour…' : "Avec des valeurs d'exemple"}</span>
          </div>
          <div className="apercu-enveloppe">
            <div className="apercu-ligne">
              <span>De</span>Yobante Colis
            </div>
            <div className="apercu-ligne">
              <span>Objet</span>
              <strong>
                <TexteAvecVariables texte={sujet} />
              </strong>
            </div>
          </div>
          {apercu === null ? (
            <div className="apercu-chargement">
              <div className="spinner" />
            </div>
          ) : (
            <iframe title="Aperçu de l'email" srcDoc={apercu} sandbox="" className="apercu-email" />
          )}
        </div>
      </div>

      {confirmerReinit && (
        <Confirmation
          titre="Rétablir le modèle par défaut ?"
          message="Vos modifications de l'objet et du contenu seront perdues. Cette action est définitive."
          libelleOk="Rétablir"
          danger
          onConfirmer={reinitialiser}
          onClose={() => setConfirmerReinit(false)}
        />
      )}
    </Modal>
  );
}

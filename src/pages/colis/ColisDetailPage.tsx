import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Colis } from '@/api/types';
import Icon from '@/components/Icon';
import { Badge, Card, ErrorBox, Field, KV, Loader, Modal, StatutBadge, toast } from '@/components/ui';
import {
  CATEGORIES, MODES_DEPOT, MODES_LIVRAISON, PAYS, STATUTS_COLIS, STATUTS_FACTURE, TYPES_CONTENU, libelle,
} from '@/lib/labels';
import { date, dateHeure, montant, nomComplet, ouvrirDocument, poids, urlSure } from '@/lib/format';
import { useAction, useInvalider } from '@/lib/hooks';
import { FormModal } from '@/components/FormModal';
import type { PointRef, Personne } from '@/api/types';
import { estAdmin, useAuth } from '@/auth/store';

type Dialogue =
  | null | 'valider' | 'refuser' | 'proposition' | 'evenement' | 'pesee' | 'note'
  | 'modifier' | 'pointRetrait' | 'coursier' | 'coutRevient' | 'photos';

export default function ColisDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const admin = estAdmin(useAuth((s) => s.utilisateur));

  const q = useQuery({
    queryKey: ['colis', id],
    queryFn: () => api.get<{ colis: Colis }>(`/admin/colis/${id}`).then((r) => r.colis),
  });

  const imprimer = async (doc: 'etiquettes' | 'bordereau') => {
    try {
      ouvrirDocument(await api.html(`/admin/colis/${id}/${doc}`));
    } catch (e) {
      toast.error(e);
    }
  };

  const codeRetrait = useAction(() => api.post<{ codeRetrait: string }>(`/admin/colis/${id}/code-retrait`), {
    succes: 'Nouveau code de retrait généré',
    invalider: ['colis'],
  });

  if (q.isLoading) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} />;
  const c = q.data!;
  const aEtudier = c.statut === 'en_attente_validation';
  // Une proposition non encore acceptée peut être remplacée ou retirée
  const devisEnCours = c.statut === 'devis_propose';
  const fermer = () => setDialogue(null);

  return (
    <>
      <span className="back" onClick={() => navigate(-1)}>
        <Icon name="arrow-left" size={15} /> Retour
      </span>

      <div className="hero">
        <span className="hero-ref">{c.reference}</span>
        <StatutBadge table={STATUTS_COLIS} valeur={c.statut} />
        <Badge ton="bleu">{libelle(CATEGORIES, c.categorie)}</Badge>
        {c.enRetard && <Badge ton="rouge">En retard</Badge>}
        <div className="actions">
          {admin && aEtudier && c.categorie !== 'colis_xxl' && (
            <button className="btn success" onClick={() => setDialogue('valider')}>
              <Icon name="check" size={15} /> Valider
            </button>
          )}
          {admin && (aEtudier || devisEnCours) && c.categorie === 'colis_xxl' && (
            <button className="btn success" onClick={() => setDialogue('proposition')}>
              <Icon name="coins" size={15} /> {devisEnCours ? 'Nouvelle proposition' : 'Proposer un tarif'}
            </button>
          )}
          {admin && (aEtudier || devisEnCours) && (
            <button className="btn danger" onClick={() => setDialogue('refuser')}>
              <Icon name="x" size={15} /> Refuser
            </button>
          )}
          {!!c.transitionsPossibles?.length && (
            <button className="btn" onClick={() => setDialogue('evenement')}>
              <Icon name="plus" size={15} /> Événement de suivi
            </button>
          )}
          {admin && (
            <button className="btn secondary" onClick={() => setDialogue('pesee')}>
              <Icon name="scale" size={15} /> Pesée
            </button>
          )}
          <button className="btn secondary" onClick={() => imprimer('etiquettes')}>
            <Icon name="printer" size={15} /> Étiquettes
          </button>
          <button className="btn secondary" onClick={() => imprimer('bordereau')}>
            <Icon name="file-text" size={15} /> Bordereau
          </button>
        </div>
      </div>

      {aEtudier && c.dateLimiteEtude && (
        <div className="alert warn">
          <Icon name="clock" size={16} />
          <div>Demande à étudier avant le {dateHeure(c.dateLimiteEtude)}.</div>
        </div>
      )}

      <div className="grid grid-main-side">
        <div>
          <Card title="Expédition">
            <div className="kv">
              <KV label="Trajet">
                {c.villeDepart?.nom ?? '—'} ({libelle(PAYS, c.paysDepart)}) → {c.villeArrivee?.nom ?? '—'} (
                {libelle(PAYS, c.paysArrivee)})
              </KV>
              <KV label="Service">{c.service?.nom}</KV>
              <KV label="Dépôt">
                {libelle(MODES_DEPOT, c.modeDepot)}
                {c.pointCollecteDepart && <div className="muted small">{c.pointCollecteDepart.nom}</div>}
              </KV>
              <KV label="Livraison">
                {libelle(MODES_LIVRAISON, c.modeLivraison)}
                {c.pointRetrait && <div className="muted small">{c.pointRetrait.nom}</div>}
              </KV>
              <KV label="Contenu">{libelle(TYPES_CONTENU, c.typeContenu)}</KV>
              <KV label="Description">{c.description || '—'}</KV>
              <KV label="Point actuel">{c.pointActuel?.nom ?? '—'}</KV>
              <KV label="Conteneur">
                {c.rotation ? <Link to={`/conteneurs/${c.rotation.id}`}>{c.rotation.reference}</Link> : '—'}
              </KV>
              <KV label="Livraison estimée">{date(c.dateLivraisonEstimee)}</KV>
              <KV label="Code de retrait">
                {c.codeRetrait ?? '—'}{' '}
                <button className="btn ghost sm" onClick={() => codeRetrait.mutate()} title="Régénérer">
                  <Icon name="refresh-cw" size={13} />
                </button>
              </KV>
            </div>
            <div className="actions" style={{ marginTop: 10 }}>
              {c.fragile && <Badge ton="orange">Fragile</Badge>}
              {c.marchandiseDangereuse && <Badge ton="rouge">Marchandise dangereuse</Badge>}
            </div>
          </Card>

          <div className="grid grid-2">
            <Card title="Expéditeur">
              <div className="kv one">
                <KV label="Nom">
                  {c.expediteurNom}
                  {c.expediteurEntreprise && <div className="muted small">{c.expediteurEntreprise}</div>}
                </KV>
                <KV label="Contact">
                  {c.expediteurTelephone}
                  {c.expediteurEmail && <div className="muted small">{c.expediteurEmail}</div>}
                </KV>
                <KV label="Adresse">{c.adresseDepart || '—'}</KV>
                <KV label="Compte client">
                  {c.client ? <Link to={`/clients/${c.client.id}`}>{nomComplet(c.client)}</Link> : '—'}
                </KV>
              </div>
            </Card>
            <Card title="Destinataire">
              <div className="kv one">
                <KV label="Nom">{c.destinataireNom}</KV>
                <KV label="Contact">
                  {c.destinataireTelephone}
                  {c.destinataireEmail && <div className="muted small">{c.destinataireEmail}</div>}
                </KV>
                <KV label="Adresse">
                  {c.adresseLivraison || '—'}
                  {(c.destinataireQuartier || c.destinatairePointRepere) && (
                    <div className="muted small">
                      {[c.destinataireQuartier, c.destinataireArrondissement, c.destinataireDepartement]
                        .filter(Boolean)
                        .join(', ')}
                      {c.destinatairePointRepere && ` — repère : ${c.destinatairePointRepere}`}
                    </div>
                  )}
                </KV>
                <KV label="Instructions">{c.instructionsLivraison || '—'}</KV>
              </div>
            </Card>
          </div>

          <Card title={`Pièces (${c.pieces?.length ?? 0})`} flush>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>N° de pièce</th><th>Désignation</th><th>Poids</th><th>Dimensions (cm)</th></tr>
                </thead>
                <tbody>
                  {c.pieces?.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.numeroSuivi ?? '—'}</td>
                      <td>{p.designation || p.typeEmballage || '—'}</td>
                      <td>{poids(p.poidsKg)}</td>
                      <td className="small">
                        {p.longueurCm ? `${p.longueurCm} × ${p.largeurCm} × ${p.hauteurCm}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-body kv">
              <KV label="Poids réel">{poids(c.poidsReelKg)}</KV>
              <KV label="Poids volumétrique">{poids(c.poidsVolumetriqueKg)}</KV>
              <KV label="Poids facturé">{poids(c.poidsFactureKg)}</KV>
              <KV label="Poids vérifié">{poids(c.poidsVerifieKg)}</KV>
            </div>
          </Card>

          {!!c.lignesForfait?.length && (
            <Card title="Articles (grille forfaitaire)" flush>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Article</th><th>Qté</th><th className="right">Prix unitaire</th><th className="right">Montant</th></tr>
                  </thead>
                  <tbody>
                    {c.lignesForfait.map((l, i) => (
                      <tr key={i}>
                        <td>{l.libelle}</td>
                        <td>{l.quantite}</td>
                        <td className="right">{montant(l.prixUnitaire, c.devise)}</td>
                        <td className="right">{montant(l.montant, c.devise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {!!c.photos?.length && (
            <Card title={`Photos (${c.photos.length})`}>
              <div className="photos">
                {c.photos.map((p, i) => {
                  const url = urlPhoto(p);
                  return url ? <a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Photo ${i + 1}`} /></a> : null;
                })}
              </div>
            </Card>
          )}

          {c.notesInternes && (
            <Card title="Notes internes">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.86rem' }}>{c.notesInternes}</div>
            </Card>
          )}
        </div>

        <div>
          <Card title="Gestion">
            <div className="actions">
              {admin && <button className="btn secondary sm" onClick={() => setDialogue('modifier')}><Icon name="pencil" size={13} /> Modifier</button>}
              {admin && c.modeLivraison === 'point_retrait' && (
                <button className="btn secondary sm" onClick={() => setDialogue('pointRetrait')}><Icon name="map-pin" size={13} /> Point de retrait</button>
              )}
              {admin && <button className="btn secondary sm" onClick={() => setDialogue('coursier')}><Icon name="truck" size={13} /> Coursier</button>}
              {admin && <button className="btn secondary sm" onClick={() => setDialogue('coutRevient')}><Icon name="coins" size={13} /> Coût de revient</button>}
              <button className="btn secondary sm" onClick={() => setDialogue('photos')}><Icon name="image" size={13} /> Photos</button>
              <button className="btn secondary sm" onClick={() => setDialogue('note')}><Icon name="edit" size={13} /> Note</button>
            </div>
            <div className="kv one" style={{ marginTop: 12 }}>
              <KV label="Coursier enlèvement">{c.coursierEnlevement ? nomComplet(c.coursierEnlevement) : '—'}</KV>
              <KV label="Coursier livraison">{c.coursierLivraison ? nomComplet(c.coursierLivraison) : '—'}</KV>
            </div>
          </Card>

          <Card title="Montants">
            <div className="kv one">
              <KV label="Fret">{montant(c.montantFret, c.devise)}</KV>
              <KV label="Surcharges">{montant(c.montantSurcharges, c.devise)}</KV>
              <KV label="Assurance">{montant(c.montantAssurance, c.devise)}</KV>
              <KV label="TVA">{montant(c.montantTva, c.devise)}</KV>
              <KV label="Droits de douane">{montant(c.montantDroitsDouane, c.devise)}</KV>
              <KV label="Total">
                <strong>{montant(c.montantTotal, c.devise)}</strong>
              </KV>
              {admin && (
                <KV label="Coût de revient / marge">
                  {c.coutRevient != null ? (
                    <>
                      {montant(c.coutRevient, c.devise)}
                      <span className="muted small"> · marge {montant(Number(c.montantTotal ?? 0) - Number(c.coutRevient), c.devise)}</span>
                    </>
                  ) : '—'}
                </KV>
              )}
              <KV label="Valeur déclarée">{montant(c.valeurDeclaree, c.deviseValeur ?? c.devise)}</KV>
            </div>
            {c.facture && (
              <div style={{ marginTop: 12 }}>
                <Link to={`/factures/${c.facture.id}`}>Facture {c.facture.reference}</Link>{' '}
                <StatutBadge table={STATUTS_FACTURE} valeur={c.facture.statut} />
              </div>
            )}
          </Card>

          <Card title="Suivi" right={<button className="btn ghost sm" onClick={() => setDialogue('note')}>+ Note</button>}>
            {!c.historique?.length ? (
              <div className="muted small">Aucun événement</div>
            ) : (
              <ul className="timeline">
                {c.historique.map((e) => (
                  <li key={e.id}>
                    <div className="tl-title">
                      {e.libelle ?? e.codeEvenement}
                      {e.visiblePublic === false && <> <Badge>Interne</Badge></>}
                    </div>
                    <div className="tl-meta">
                      {dateHeure(e.dateEvenement)}
                      {e.lieu && ` · ${e.lieu}`}
                      {e.auteur && ` · ${nomComplet(e.auteur)}`}
                    </div>
                    {e.commentaire && <div className="tl-comment">{e.commentaire}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {dialogue === 'valider' && <DialogueValider colis={c} onClose={fermer} />}
      {dialogue === 'proposition' && <DialogueProposition colis={c} onClose={fermer} />}
      {dialogue === 'refuser' && <DialogueRefuser colis={c} onClose={fermer} />}
      {dialogue === 'evenement' && <DialogueEvenement colis={c} onClose={fermer} />}
      {dialogue === 'pesee' && <DialoguePesee colis={c} onClose={fermer} />}
      {dialogue === 'note' && <DialogueNote colis={c} onClose={fermer} />}
      {dialogue === 'modifier' && <DialogueModifier colis={c} onClose={fermer} />}
      {dialogue === 'pointRetrait' && <DialoguePointRetrait colis={c} onClose={fermer} />}
      {dialogue === 'coursier' && <DialogueCoursier colis={c} onClose={fermer} />}
      {dialogue === 'coutRevient' && <DialogueCoutRevient colis={c} onClose={fermer} />}
      {dialogue === 'photos' && <DialoguePhotos colis={c} onClose={fermer} />}
    </>
  );
}

/** Les photos sont stockées par le backend sous forme d'URL ou d'objet Cloudinary. */
const urlPhoto = (p: unknown): string | undefined =>
  urlSure(typeof p === 'string' ? p : (p as { url?: string; secure_url?: string })?.url ?? (p as { secure_url?: string })?.secure_url);

/* ── Dialogues d'action ──────────────────────────────────────────────────── */

type PropsDialogue = { colis: Colis; onClose: () => void };

const nombreOuRien = (v: string) => (v.trim() === '' ? undefined : Number(v));

function Pied({ onClose, onOk, envoi, libelleOk, danger }: {
  onClose: () => void; onOk: () => void; envoi: boolean; libelleOk: string; danger?: boolean;
}) {
  return (
    <>
      <button className="btn secondary" onClick={onClose}>Annuler</button>
      <button className={`btn${danger ? ' danger' : ''}`} onClick={onOk} disabled={envoi}>
        {envoi ? 'Envoi…' : libelleOk}
      </button>
    </>
  );
}

function DialogueValider({ colis, onClose }: PropsDialogue) {
  const [montantTotal, setMontant] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [datePrevueEnlevement, setDate] = useState('');
  const a = useAction(
    () =>
      api.post(`/admin/colis/${colis.id}/valider`, {
        montantTotal: nombreOuRien(montantTotal),
        commentaire: commentaire || undefined,
        datePrevueEnlevement: datePrevueEnlevement || undefined,
      }),
    { succes: 'Demande validée', invalider: ['colis', 'dashboard'] }
  );
  return (
    <Modal title="Valider la demande" onClose={onClose}
      footer={<Pied onClose={onClose} envoi={a.isPending} libelleOk="Valider" onOk={() => a.mutate(undefined, { onSuccess: onClose })} />}>
      <Field label={`Montant ajusté (${colis.devise})`} hint={`Laisser vide pour conserver ${montant(colis.montantTotal, colis.devise)}`}>
        <input className="input" type="number" min="0" value={montantTotal} onChange={(e) => setMontant(e.target.value)} />
      </Field>
      <Field label="Date prévue d'enlèvement">
        <input className="input" type="date" value={datePrevueEnlevement} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Commentaire au client">
        <textarea className="textarea" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
      </Field>
    </Modal>
  );
}

function DialogueProposition({ colis, onClose }: PropsDialogue) {
  const [montantTotal, setMontant] = useState('');
  const [validiteJours, setValidite] = useState('7');
  const [commentaire, setCommentaire] = useState('');
  const a = useAction(
    () =>
      api.post(`/admin/colis/${colis.id}/proposition`, {
        montantTotal: Number(montantTotal),
        validiteJours: nombreOuRien(validiteJours),
        commentaire: commentaire || undefined,
      }),
    { succes: 'Proposition envoyée au client', invalider: ['colis', 'dashboard'] }
  );
  return (
    <Modal title="Proposer un tarif (colis XXL)" onClose={onClose}
      footer={<Pied onClose={onClose} envoi={a.isPending} libelleOk="Envoyer la proposition"
        onOk={() => (Number(montantTotal) > 0 ? a.mutate(undefined, { onSuccess: onClose }) : toast.error('Indiquez un montant'))} />}>
      <Field label={`Montant proposé (${colis.devise})`}>
        <input className="input" type="number" min="0" autoFocus value={montantTotal} onChange={(e) => setMontant(e.target.value)} />
      </Field>
      <Field label="Validité (jours)">
        <input className="input" type="number" min="1" max="60" value={validiteJours} onChange={(e) => setValidite(e.target.value)} />
      </Field>
      <Field label="Commentaire au client">
        <textarea className="textarea" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
      </Field>
    </Modal>
  );
}

function DialogueRefuser({ colis, onClose }: PropsDialogue) {
  const [motif, setMotif] = useState('');
  const a = useAction(() => api.post(`/admin/colis/${colis.id}/refuser`, { motif }), {
    succes: 'Demande refusée',
    invalider: ['colis', 'dashboard'],
  });
  return (
    <Modal title="Refuser la demande" onClose={onClose}
      footer={<Pied onClose={onClose} envoi={a.isPending} danger libelleOk="Confirmer le refus"
        onOk={() => (motif.trim().length >= 3 ? a.mutate(undefined, { onSuccess: onClose }) : toast.error('Le motif est obligatoire (3 caractères min.)'))} />}>
      <p className="small" style={{ marginBottom: 12 }}>Le client sera informé du motif du refus.</p>
      <Field label="Motif">
        <textarea className="textarea" autoFocus value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : contenu non conforme…" />
      </Field>
    </Modal>
  );
}

interface CodeEvenement { code: string; libelle: string; statutInduit: string | null }

function DialogueEvenement({ colis, onClose }: PropsDialogue) {
  const codes = useQuery({
    queryKey: ['codes-evenements'],
    queryFn: () => api.get<{ evenements: CodeEvenement[] }>('/admin/colis/codes-evenements').then((r) => r.evenements),
    staleTime: Infinity,
  });
  // Seuls les événements compatibles avec la machine à états du colis sont proposés
  const possibles = (codes.data ?? []).filter(
    (e) => e.statutInduit === null || colis.transitionsPossibles?.includes(e.statutInduit)
  );
  const [codeEvenement, setCode] = useState('');
  const [lieu, setLieu] = useState('');
  const [pays, setPays] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [codeRetrait, setCodeRetrait] = useState('');
  const [visiblePublic, setVisible] = useState(true);

  const a = useAction(
    () =>
      api.post(`/admin/colis/${colis.id}/evenements`, {
        codeEvenement,
        lieu: lieu || undefined,
        pays: pays || undefined,
        commentaire: commentaire || undefined,
        codeRetrait: codeRetrait || undefined,
        visiblePublic,
      }),
    { succes: 'Événement enregistré', invalider: ['colis', 'dashboard'] }
  );

  return (
    <Modal title="Enregistrer un événement de suivi" onClose={onClose}
      footer={<Pied onClose={onClose} envoi={a.isPending} libelleOk="Enregistrer"
        onOk={() => (codeEvenement ? a.mutate(undefined, { onSuccess: onClose }) : toast.error('Choisissez un événement'))} />}>
      {codes.isLoading ? <Loader /> : (
        <>
          <Field label="Événement">
            <select className="select" value={codeEvenement} onChange={(e) => setCode(e.target.value)}>
              <option value="">— Choisir —</option>
              {possibles.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.libelle}{e.statutInduit ? ` → ${STATUTS_COLIS[e.statutInduit]?.label ?? e.statutInduit}` : ' (information)'}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-row">
            <Field label="Lieu">
              <input className="input" value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Ex. : Dakar, port" />
            </Field>
            <Field label="Pays">
              <select className="select" value={pays} onChange={(e) => setPays(e.target.value)}>
                <option value="">—</option>
                <option value="FR">France</option>
                <option value="SN">Sénégal</option>
              </select>
            </Field>
          </div>
          {codeEvenement === 'RETIRE' && (
            <Field label="Code de retrait remis par le destinataire">
              <input className="input" value={codeRetrait} onChange={(e) => setCodeRetrait(e.target.value)} />
            </Field>
          )}
          <Field label="Commentaire">
            <textarea className="textarea" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={visiblePublic} onChange={(e) => setVisible(e.target.checked)} />
            Visible dans le suivi public
          </label>
        </>
      )}
    </Modal>
  );
}

function DialoguePesee({ colis, onClose }: PropsDialogue) {
  const [poidsVerifieKg, setPoids] = useState(String(colis.poidsVerifieKg ?? colis.poidsReelKg ?? ''));
  const [motif, setMotif] = useState('');
  const a = useAction(
    () => api.post(`/admin/colis/${colis.id}/pesee`, { poidsVerifieKg: Number(poidsVerifieKg), motif: motif || undefined }),
    { succes: 'Pesée corrigée, tarif recalculé', invalider: ['colis'] }
  );
  return (
    <Modal title="Corriger la pesée" onClose={onClose}
      footer={<Pied onClose={onClose} envoi={a.isPending} libelleOk="Enregistrer"
        onOk={() => (Number(poidsVerifieKg) > 0 ? a.mutate(undefined, { onSuccess: onClose }) : toast.error('Poids invalide'))} />}>
      <p className="small" style={{ marginBottom: 12 }}>
        Poids déclaré : {poids(colis.poidsReelKg)} — facturé : {poids(colis.poidsFactureKg)}. Le tarif est recalculé à partir du poids vérifié.
      </p>
      <Field label="Poids vérifié (kg)">
        <input className="input" type="number" step="0.001" min="0" value={poidsVerifieKg} onChange={(e) => setPoids(e.target.value)} />
      </Field>
      <Field label="Motif">
        <input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} />
      </Field>
    </Modal>
  );
}

function DialogueNote({ colis, onClose }: PropsDialogue) {
  const [note, setNote] = useState('');
  const a = useAction(() => api.post(`/admin/colis/${colis.id}/notes`, { note }), {
    succes: 'Note ajoutée',
    invalider: ['colis'],
  });
  return (
    <Modal title="Ajouter une note interne" onClose={onClose}
      footer={<Pied onClose={onClose} envoi={a.isPending} libelleOk="Ajouter"
        onOk={() => (note.trim() ? a.mutate(undefined, { onSuccess: onClose }) : toast.error('La note est vide'))} />}>
      <Field label="Note (non visible du client)">
        <textarea className="textarea" autoFocus value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

function DialogueModifier({ colis, onClose }: PropsDialogue) {
  const invalider = useInvalider();
  return (
    <FormModal
      large
      title="Modifier l'expédition"
      intro={<p className="small muted">Données descriptives uniquement : le statut passe par les événements, les montants par la pesée.</p>}
      champs={[
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'destinataireNom', label: 'Destinataire' },
        { name: 'destinataireTelephone', label: 'Téléphone destinataire', type: 'tel' },
        { name: 'destinataireEmail', label: 'Email destinataire', type: 'email' },
        { name: 'adresseLivraison', label: 'Adresse de livraison' },
        { name: 'destinataireQuartier', label: 'Quartier' },
        { name: 'destinataireArrondissement', label: 'Arrondissement' },
        { name: 'destinataireDepartement', label: 'Département' },
        { name: 'destinatairePointRepere', label: 'Point de repère' },
        { name: 'instructionsLivraison', label: 'Instructions de livraison', type: 'textarea' },
        { name: 'notesInternes', label: 'Notes internes', type: 'textarea' },
      ]}
      initial={colis as never}
      succes="Expédition mise à jour"
      onSubmit={async (corps) => { await api.put(`/admin/colis/${colis.id}`, corps); invalider('colis'); }}
      onClose={onClose}
    />
  );
}

function DialoguePointRetrait({ colis, onClose }: PropsDialogue) {
  const invalider = useInvalider();
  const points = useQuery({
    queryKey: ['points-collecte', 'options', colis.paysArrivee],
    queryFn: () =>
      api.get<{ points: PointRef[] }>('/admin/points-collecte', { pays: colis.paysArrivee, isActive: true, limit: 100 }).then((r) => r.points),
  });
  if (points.isLoading) return null;
  return (
    <FormModal
      title="Changer le point de retrait"
      champs={[
        {
          name: 'pointRetraitId', label: 'Nouveau point', type: 'select', required: true, full: true,
          options: (points.data ?? [])
            .filter((p) => p.id !== colis.pointRetrait?.id)
            .map((p) => ({ value: p.id, label: `${p.code} — ${p.nom}` })),
        },
        { name: 'motif', label: 'Motif', full: true },
      ]}
      intro={<p className="small">Point actuel : {colis.pointRetrait?.nom ?? '—'}. Le destinataire est prévenu.</p>}
      succes="Point de retrait modifié"
      onSubmit={async (corps) => { await api.patch(`/admin/colis/${colis.id}/point-retrait`, corps); invalider('colis'); }}
      onClose={onClose}
    />
  );
}

function DialogueCoursier({ colis, onClose }: PropsDialogue) {
  const invalider = useInvalider();
  const [mission, setMission] = useState<'enlevement' | 'livraison'>(
    ['arrive', 'disponible_retrait', 'en_livraison'].includes(colis.statut) ? 'livraison' : 'enlevement'
  );
  const pays = mission === 'enlevement' ? colis.paysDepart : colis.paysArrivee;
  const coursiers = useQuery({
    queryKey: ['coursiers-disponibles', pays],
    queryFn: () => api.get<{ coursiers: Personne[] }>('/admin/personnel/coursiers-disponibles', { pays }).then((r) => r.coursiers),
  });
  return (
    <FormModal
      key={`${mission}-${coursiers.data?.length ?? 0}`}
      title="Affecter un coursier"
      intro={
        <div className="chips">
          {(['enlevement', 'livraison'] as const).map((m) => (
            <button key={m} type="button" className={`chip${mission === m ? ' active' : ''}`} onClick={() => setMission(m)}>
              {m === 'enlevement' ? 'Enlèvement' : 'Livraison'}
            </button>
          ))}
        </div>
      }
      champs={[
        {
          name: 'coursierId', label: `Coursier (${libelle(PAYS, pays)})`, type: 'select', required: true, full: true,
          options: (coursiers.data ?? []).map((p) => ({ value: p.id, label: `${nomComplet(p)}${p.telephone ? ` · ${p.telephone}` : ''}` })),
          hint: coursiers.isLoading ? 'Chargement…' : !coursiers.data?.length ? 'Aucun coursier disponible dans ce pays' : undefined,
        },
      ]}
      succes="Coursier affecté"
      onSubmit={async (corps) => { await api.patch(`/admin/colis/${colis.id}/coursier`, { ...corps, mission }); invalider('colis'); }}
      onClose={onClose}
    />
  );
}

function DialogueCoutRevient({ colis, onClose }: PropsDialogue) {
  const invalider = useInvalider();
  return (
    <FormModal
      title="Coût de revient"
      intro={
        <p className="small">
          Fret, dédouanement et livraison réellement payés, dans la devise du colis ({colis.devise}). Sert au calcul de la marge du tableau de bord.
        </p>
      }
      champs={[{ name: 'coutRevient', label: `Coût de revient (${colis.devise})`, type: 'number', step: '0.01', full: true }]}
      initial={{ coutRevient: colis.coutRevient }}
      succes="Coût de revient enregistré"
      onSubmit={async (corps) => {
        await api.patch(`/admin/colis/${colis.id}/cout-revient`, { coutRevient: corps.coutRevient ?? null });
        invalider('colis', 'dashboard');
      }}
      onClose={onClose}
    />
  );
}

function DialoguePhotos({ colis, onClose }: PropsDialogue) {
  const invalider = useInvalider();
  return (
    <FormModal
      title="Ajouter des photos"
      champs={[
        { name: 'photos', label: 'Photos (JPEG ou PNG, 10 max., 10 Mo chacune)', type: 'files', accept: 'image/jpeg,image/png', required: true },
      ]}
      submitLabel="Téléverser"
      succes="Photos ajoutées"
      onSubmit={async (corps) => { await api.upload(`/admin/colis/${colis.id}/photos`, corps); invalider('colis'); }}
      onClose={onClose}
    />
  );
}

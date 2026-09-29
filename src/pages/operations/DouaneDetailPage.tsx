import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, avecVersion } from '@/api/client';
import Icon from '@/components/Icon';
import { FormModal, type ChampDef } from '@/components/FormModal';
import { Card, Empty, ErrorBox, KV, Loader, StatutBadge, toast } from '@/components/ui';
import {
  ETATS_MARCHANDISE, INCOTERMS, PAYS, STATUTS_DOUANE, TYPES_CONTENU, TYPES_DOCUMENT_DOUANE, UNITES_DOUANE, libelle,
} from '@/lib/labels';
import { dateHeure, montant, ouvrirDocument, poids, urlSure } from '@/lib/format';
import { useAction, useInvalider } from '@/lib/hooks';
import type { ArticleDouane, Declaration } from './DouanePage';
import { R, D } from '@/lib/routes';

type Dialogue = null | 'modifier' | 'statut' | 'article' | 'document';

const CHAMPS_ARTICLE: ChampDef[] = [
  { name: 'designation', label: 'Désignation', required: true, full: true },
  { name: 'codeSh', label: 'Code SH', placeholder: '851712', hint: '6 à 10 chiffres' },
  { name: 'marque', label: 'Marque' },
  { name: 'quantite', label: 'Quantité', type: 'number' },
  { name: 'unite', label: 'Unité', type: 'select', options: UNITES_DOUANE, required: true },
  { name: 'valeurUnitaire', label: 'Valeur unitaire', type: 'number', required: true },
  { name: 'poidsNetKg', label: 'Poids net (kg)', type: 'number' },
  { name: 'paysOrigine', label: "Pays d'origine (ISO 2)", placeholder: 'CN' },
  { name: 'tauxDroits', label: 'Taux de droits (%)', type: 'number' },
  { name: 'etat', label: 'État', type: 'select', options: ETATS_MARCHANDISE },
];

export default function DouaneDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const invalider = useInvalider();
  const [dialogue, setDialogue] = useState<Dialogue>(null);

  const q = useQuery({
    queryKey: ['douane', id],
    queryFn: () => api.get<{ declaration: Declaration }>(`/admin/douane/${id}`).then((r) => r.declaration),
  });
  const retirer = useAction((a: ArticleDouane) => api.delete(`/admin/douane/${id}/articles/${a.id}`), {
    succes: 'Article retiré',
    invalider: ['douane'],
  });

  // isPending (pas isLoading) : un nouvel essai mis en pause (onglet masqué, hors ligne)
  // laisse la requête sans donnée ni erreur, et `q.data` serait indéfini
  if (q.isPending) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const fermer = () => setDialogue(null);
  const imprimer = async () => {
    try {
      ouvrirDocument(await api.html(`/admin/douane/${id}/facture-commerciale`));
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <button type="button" className="back" onClick={() => navigate(R.douane)}><Icon name="arrow-left" size={15} /> Douane</button>
      <div className="hero">
        <span className="hero-ref">{d.colis?.reference ?? 'Déclaration'}</span>
        <StatutBadge table={STATUTS_DOUANE} valeur={d.statut} />
        <div className="actions">
          <button className="btn" onClick={() => setDialogue('statut')}><Icon name="refresh-cw" size={15} /> Changer le statut</button>
          <button className="btn secondary" onClick={() => setDialogue('modifier')}><Icon name="pencil" size={15} /> Modifier</button>
          <button className="btn secondary" onClick={() => setDialogue('document')}><Icon name="file-text" size={15} /> Ajouter un document</button>
          <button className="btn secondary" onClick={imprimer}><Icon name="printer" size={15} /> Facture commerciale</button>
        </div>
      </div>

      {d.motifBlocage && ['bloquee', 'refusee'].includes(d.statut) && (
        <div className="alert error"><Icon name="alert-triangle" size={16} /><div>{d.motifBlocage}</div></div>
      )}

      <div className="grid grid-main-side">
        <div>
          <Card title={`Articles déclarés (${d.articles?.length ?? 0})`} right={<button className="btn sm" onClick={() => setDialogue('article')}><Icon name="plus" size={13} /> Article</button>} flush>
            {!d.articles?.length ? <Empty>Aucun article : la déclaration doit détailler le contenu ligne à ligne.</Empty> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Désignation</th><th>Code SH</th><th>Qté</th><th className="right">Valeur unit.</th><th>Origine</th><th>Droits</th><th>État</th><th /></tr></thead>
                  <tbody>
                    {d.articles.map((a) => (
                      <tr key={a.id}>
                        <td><strong>{a.designation}</strong>{a.marque && <div className="muted small">{a.marque}</div>}</td>
                        <td className="mono">{a.codeSh || '—'}</td>
                        <td>{Number(a.quantite)} {libelle(UNITES_DOUANE, a.unite).toLowerCase()}</td>
                        <td className="right">{montant(a.valeurUnitaire, d.devise)}</td>
                        <td>{a.paysOrigine || '—'}</td>
                        <td>{a.tauxDroits != null ? `${Number(a.tauxDroits)} %` : '—'}</td>
                        <td className="small">{libelle(ETATS_MARCHANDISE, a.etat)}</td>
                        <td>
                          <button className="btn ghost sm" title="Retirer" onClick={() => confirm(`Retirer ${a.designation} ?`) && retirer.mutate(a)}>
                            <Icon name="trash-2" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={`Documents (${d.documents?.length ?? 0})`}>
            {!d.documents?.length ? <div className="muted small">Aucun justificatif</div> : (
              <ul style={{ listStyle: 'none' }}>
                {d.documents.map((doc, i) => (
                  <li key={i} style={{ padding: '0.3rem 0' }}>
                    <Icon name="file-text" size={14} />{' '}
                    <a href={urlSure(doc.url)} target="_blank" rel="noreferrer">{doc.libelle || libelle(TYPES_DOCUMENT_DOUANE, doc.type)}</a>
                    <span className="muted small"> · {libelle(TYPES_DOCUMENT_DOUANE, doc.type)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Déclaration">
          <div className="kv one">
            <KV label="Colis">{d.colis ? <Link to={`${D.colis}/${d.colis.id}`}>{d.colis.reference}</Link> : '—'}</KV>
            <KV label="Sens">{libelle(PAYS, d.paysExport)} → {libelle(PAYS, d.paysImport)}</KV>
            <KV label="Nature">{libelle(TYPES_CONTENU, d.motifExport)}</KV>
            <KV label="Incoterm">{libelle(INCOTERMS, d.incoterm)}</KV>
            <KV label="N° de déclaration">{d.numeroDeclaration || '—'}</KV>
            <KV label="Valeur totale">{montant(d.valeurTotale, d.devise)}</KV>
            <KV label="Frais transport / assurance">{montant(d.fraisTransport, d.devise)} / {montant(d.fraisAssurance, d.devise)}</KV>
            <KV label="Poids brut / net">{poids(d.poidsBrutKg)} / {poids(d.poidsNetKg)}</KV>
            <KV label="Droits et taxes estimés">{montant(d.droitsEstimes, d.devise)} + {montant(d.taxesEstimees, d.devise)}</KV>
            <KV label="Droits et taxes réels">
              {d.droitsReels != null || d.taxesReelles != null ? `${montant(d.droitsReels ?? 0, d.devise)} + ${montant(d.taxesReelles ?? 0, d.devise)}` : '—'}
            </KV>
            <KV label="EORI / NINEA / TVA">{[d.numeroEori, d.numeroNinea, d.numeroTvaIntracom].filter(Boolean).join(' · ') || '—'}</KV>
            <KV label="Soumise le">{dateHeure(d.dateSoumission)}</KV>
            <KV label="Dédouanée le">{dateHeure(d.dateDedouanement)}</KV>
            {d.commentaire && <KV label="Commentaire">{d.commentaire}</KV>}
          </div>
        </Card>
      </div>

      {dialogue === 'modifier' && (
        <FormModal
          title="Modifier la déclaration"
          champs={[
            { name: 'motifExport', label: 'Nature', type: 'select', options: TYPES_CONTENU, required: true },
            { name: 'incoterm', label: 'Incoterm', type: 'select', options: { DAP: 'DAP', DDP: 'DDP' }, required: true },
            { name: 'numeroDeclaration', label: 'N° de déclaration' },
            { name: 'numeroEori', label: 'N° EORI' },
            { name: 'numeroNinea', label: 'N° NINEA' },
            { name: 'numeroTvaIntracom', label: 'N° TVA intracom.' },
            { name: 'commentaire', label: 'Commentaire', type: 'textarea' },
          ]}
          initial={d as never}
          succes="Déclaration mise à jour"
          onSubmit={async (corps, { version }) => { await api.put(`/admin/douane/${id}`, corps, avecVersion(version)); invalider('douane'); }}
          onClose={fermer}
        />
      )}
      {dialogue === 'statut' && (
        <FormModal
          title="Statut de la déclaration"
          intro={<p className="small">Le changement est répercuté sur le suivi du colis ; un blocage est signalé immédiatement au client.</p>}
          champs={[
            { name: 'statut', label: 'Nouveau statut', type: 'select', required: true,
              options: Object.fromEntries(Object.entries(STATUTS_DOUANE).filter(([k]) => k !== 'brouillon').map(([k, v]) => [k, v.label])) },
            { name: 'numeroDeclaration', label: 'N° de déclaration' },
            { name: 'motifBlocage', label: 'Motif', type: 'textarea', required: true, visible: (v) => ['bloquee', 'refusee'].includes(String(v.statut)) },
            { name: 'droitsReels', label: 'Droits réels', type: 'number', visible: (v) => v.statut === 'dedouanee' },
            { name: 'taxesReelles', label: 'Taxes réelles', type: 'number', visible: (v) => v.statut === 'dedouanee' },
          ]}
          initial={{ numeroDeclaration: d.numeroDeclaration }}
          succes="Statut mis à jour"
          onSubmit={async (corps) => { await api.patch(`/admin/douane/${id}/statut`, corps); invalider('douane', 'colis'); }}
          onClose={fermer}
        />
      )}
      {dialogue === 'article' && (
        <FormModal
          large
          title="Ajouter un article"
          champs={CHAMPS_ARTICLE}
          initial={{ quantite: 1, unite: 'piece' }}
          succes="Article ajouté"
          onSubmit={async (corps) => { await api.post(`/admin/douane/${id}/articles`, corps); invalider('douane'); }}
          onClose={fermer}
        />
      )}
      {dialogue === 'document' && (
        <FormModal
          title="Ajouter un justificatif"
          champs={[
            { name: 'type', label: 'Type', type: 'select', options: TYPES_DOCUMENT_DOUANE, required: true },
            { name: 'libelle', label: 'Libellé' },
            { name: 'document', label: 'Fichier (PDF, JPEG ou PNG)', type: 'file', required: true, full: true },
          ]}
          initial={{ type: 'justificatif' }}
          submitLabel="Téléverser"
          succes="Document ajouté"
          onSubmit={async (corps) => { await api.upload(`/admin/douane/${id}/documents`, corps); invalider('douane'); }}
          onClose={fermer}
        />
      )}
    </>
  );
}

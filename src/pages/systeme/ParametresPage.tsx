import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { estSuperAdmin, useAuth } from '@/auth/store';
import { FormModal, type ChampDef } from '@/components/FormModal';
import Icon from '@/components/Icon';
import { Card, Chips, Empty, ErrorBox, Loader, toast } from '@/components/ui';
import { useInvalider } from '@/lib/hooks';
import { EVENEMENTS_SUIVI } from '@/lib/labels';

interface Parametre {
  id: string;
  cle: string;
  valeur: string;
  type: 'texte' | 'nombre' | 'booleen' | 'json';
  categorie: string;
  libelle?: string;
  description?: string;
  modifiable: boolean;
}

type Ligne = Record<string, string | number | boolean>;

/** Libellés des colonnes connues des grilles JSON ; les autres sont dérivées du nom de la clé. */
const LIBELLES_COLONNES: Record<string, string> = {
  poidsMaxKg: 'Poids max (kg)',
  nbColis: 'Nombre de colis',
  prixHt: 'Prix HT (€)',
  codePostal: 'Code postal',
  telephone: 'Téléphone',
  departement: 'Département',
  pointRepere: 'Point de repère',
};

/** Colonnes attendues par grille, pour pouvoir ajouter une ligne même quand la grille est vide. */
const COLONNES_PAR_CLE: Record<string, string[]> = {
  grille_colissimo: ['poidsMaxKg', 'prixHt'],
  grille_enlevement_domicile_fr: ['nbColis', 'prixHt'],
};

/** Champs attendus par objet (catalogue de parametre.service.js du backend), même si la base en omet. */
const CHAMPS_PAR_CLE: Record<string, string[]> = {
  adresse_reception_fr: ['nom', 'adresse', 'codePostal', 'ville', 'telephone', 'instructions'],
  adresse_reception_sn: ['nom', 'adresse', 'quartier', 'arrondissement', 'departement', 'pointRepere', 'telephone'],
};

const libelleColonne = (k: string) =>
  LIBELLES_COLONNES[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const lireJson = (valeur: string): unknown => {
  try {
    return JSON.parse(valeur);
  } catch {
    return undefined;
  }
};
const estListeTextes = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const estObjetPlat = (v: unknown): v is Ligne =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => ['string', 'number', 'boolean'].includes(typeof x));

/** Lit une valeur JSON sous forme de liste d'objets plats, ou `null` si ce n'en est pas une. */
function lireGrille(valeur: string): Ligne[] | null {
  const v = lireJson(valeur);
  return Array.isArray(v) && v.every(estObjetPlat) ? v : null;
}

/** Édition d'une grille JSON (liste d'objets) en tableau, avec ajout / modification / suppression par formulaire. */
function GrilleJson({ cle, valeur, editable, onChange }: { cle: string; valeur: string; editable: boolean; onChange: (v: string) => void }) {
  const lignes = lireGrille(valeur) ?? [];
  const [edition, setEdition] = useState<{ index: number | null } | null>(null);

  const colonnes = [...new Set([...(COLONNES_PAR_CLE[cle] ?? []), ...lignes.flatMap((l) => Object.keys(l))])];
  const typeColonne = (k: string) => {
    const exemple = lignes.find((l) => l[k] !== undefined)?.[k];
    return typeof exemple === 'string' ? 'text' : typeof exemple === 'boolean' ? 'checkbox' : 'number';
  };
  const champs: ChampDef[] = colonnes.map((k) => ({
    name: k,
    label: libelleColonne(k),
    type: typeColonne(k),
    required: typeColonne(k) !== 'checkbox',
  }));

  // Les grilles sont triées sur leur première colonne (seuil de poids, nombre de colis…)
  const ecrire = (liste: Ligne[]) => {
    const premiere = colonnes[0];
    const triee = [...liste].sort((a, b) =>
      typeof a[premiere] === 'number' && typeof b[premiere] === 'number' ? (a[premiere] as number) - (b[premiere] as number) : 0
    );
    onChange(JSON.stringify(triee));
  };

  const formater = (v: Ligne[string] | undefined) =>
    v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : String(v);

  return (
    <div>
      {lignes.length ? (
        <table className="grille-json">
          <thead>
            <tr>
              {colonnes.map((k) => <th key={k}>{libelleColonne(k)}</th>)}
              {editable && <th style={{ width: 80 }} />}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                {colonnes.map((k) => <td key={k}>{formater(l[k])}</td>)}
                {editable && (
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button className="btn ghost sm" title="Modifier" onClick={() => setEdition({ index: i })}><Icon name="pencil" size={14} /></button>
                    <button className="btn ghost sm" title="Supprimer" onClick={() => ecrire(lignes.filter((_, j) => j !== i))}><Icon name="trash" size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="muted small">Aucune ligne</div>
      )}
      {editable && (
        <button className="btn secondary sm" style={{ marginTop: 8 }} disabled={!colonnes.length} onClick={() => setEdition({ index: null })}>
          <Icon name="plus" size={14} /> Ajouter
        </button>
      )}
      {edition && (
        <FormModal
          title={edition.index === null ? 'Ajouter une ligne' : 'Modifier la ligne'}
          champs={champs}
          initial={edition.index === null ? {} : lignes[edition.index]}
          submitLabel={edition.index === null ? 'Ajouter' : 'Valider'}
          succes={false}
          onClose={() => setEdition(null)}
          onSubmit={async (corps) => {
            const ligne = corps as Ligne;
            ecrire(edition.index === null ? [...lignes, ligne] : lignes.map((l, j) => (j === edition.index ? ligne : l)));
          }}
        />
      )}
    </div>
  );
}

/** Paramètres « liste de textes » : libellé d'un élément et, si la valeur est un code, ses choix possibles. */
const LISTES: Record<string, { element: string; options?: Record<string, string> }> = {
  produits_interdits: { element: 'Produit' },
  evenements_whatsapp: { element: 'Événement', options: EVENEMENTS_SUIVI },
};

/** Édition d'une liste de textes : un élément par ligne, ajout / modification par formulaire. */
function ListeJson({ cle, valeur, editable, onChange }: { cle: string; valeur: string; editable: boolean; onChange: (v: string) => void }) {
  const liste = (lireJson(valeur) ?? []) as string[];
  const def = LISTES[cle] ?? { element: 'Valeur' };
  const [edition, setEdition] = useState<{ index: number | null } | null>(null);
  const ecrire = (l: string[]) => onChange(JSON.stringify(l));
  const champ: ChampDef = def.options
    ? { name: 'valeur', label: def.element, type: 'select', required: true, options: def.options }
    : { name: 'valeur', label: def.element, required: true, full: true };

  return (
    <div>
      {liste.length ? (
        <table className="grille-json">
          <tbody>
            {liste.map((x, i) => (
              <tr key={i}>
                <td>
                  {def.options?.[x] ?? x}
                  {def.options && <span className="mono muted" style={{ fontSize: '0.7rem' }}> {x}</span>}
                </td>
                {editable && (
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right', width: 80 }}>
                    <button className="btn ghost sm" title="Modifier" onClick={() => setEdition({ index: i })}><Icon name="pencil" size={14} /></button>
                    <button className="btn ghost sm" title="Supprimer" onClick={() => ecrire(liste.filter((_, j) => j !== i))}><Icon name="trash" size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="muted small">Aucun élément</div>
      )}
      {editable && (
        <button className="btn secondary sm" style={{ marginTop: 8 }} onClick={() => setEdition({ index: null })}>
          <Icon name="plus" size={14} /> Ajouter
        </button>
      )}
      {edition && (
        <FormModal
          title={edition.index === null ? `Ajouter : ${def.element.toLowerCase()}` : `Modifier : ${def.element.toLowerCase()}`}
          champs={[champ]}
          initial={edition.index === null ? {} : { valeur: liste[edition.index] }}
          submitLabel={edition.index === null ? 'Ajouter' : 'Valider'}
          succes={false}
          onClose={() => setEdition(null)}
          onSubmit={async (corps) => {
            const v = String(corps.valeur);
            if (liste.some((x, j) => x === v && j !== edition.index)) throw new Error('Cet élément est déjà dans la liste');
            ecrire(edition.index === null ? [...liste, v] : liste.map((x, j) => (j === edition.index ? v : x)));
          }}
        />
      )}
    </div>
  );
}

/** Édition d'un objet (ex. une adresse) : aperçu des valeurs et formulaire de modification. */
function ObjetJson({ cle, titre, valeur, editable, onChange }: { cle: string; titre: string; valeur: string; editable: boolean; onChange: (v: string) => void }) {
  const objet = (lireJson(valeur) ?? {}) as Ligne;
  const [ouvert, setOuvert] = useState(false);
  const cles = [...new Set([...(CHAMPS_PAR_CLE[cle] ?? []), ...Object.keys(objet)])];
  const champs: ChampDef[] = cles.map((k) => ({
    name: k,
    label: libelleColonne(k),
    type: typeof objet[k] === 'number' ? 'number' : typeof objet[k] === 'boolean' ? 'checkbox' : k === 'instructions' ? 'textarea' : 'text',
  }));

  return (
    <div>
      <table className="grille-json">
        <tbody>
          {cles.map((k) => (
            <tr key={k}>
              <td className="muted" style={{ whiteSpace: 'nowrap' }}>{libelleColonne(k)}</td>
              <td>{typeof objet[k] === 'boolean' ? (objet[k] ? 'Oui' : 'Non') : String(objet[k] ?? '') || <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <button className="btn secondary sm" style={{ marginTop: 8 }} onClick={() => setOuvert(true)}>
          <Icon name="pencil" size={14} /> Modifier
        </button>
      )}
      {ouvert && (
        <FormModal
          title={titre}
          champs={champs}
          initial={objet}
          submitLabel="Valider"
          succes={false}
          onClose={() => setOuvert(false)}
          onSubmit={async (corps) => {
            // Un champ vidé revient à `null` : on garde une chaîne vide pour conserver la forme de l'objet
            const suite = Object.fromEntries(cles.map((k) => [k, corps[k] ?? (typeof objet[k] === 'number' || typeof objet[k] === 'boolean' ? objet[k] : '')]));
            onChange(JSON.stringify(suite));
          }}
        />
      )}
    </div>
  );
}

const typer = (p: Parametre, v: string) => (p.type === 'nombre' ? Number(v) : p.type === 'booleen' ? v === 'true' : v);

export default function ParametresPage() {
  const superAdmin = estSuperAdmin(useAuth((s) => s.utilisateur));
  const invalider = useInvalider();
  const [categorie, setCategorie] = useState('');
  // Valeurs modifiées et pas encore enregistrées, par clé
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);

  const q = useQuery({
    queryKey: ['parametres'],
    queryFn: () => api.get<{ parametres: Parametre[] }>('/admin/parametres').then((r) => r.parametres),
  });

  const modifies = (q.data ?? []).filter((p) => brouillon[p.cle] !== undefined && brouillon[p.cle] !== p.valeur);

  const enregistrer = async (liste: Parametre[]) => {
    for (const p of liste) {
      if (p.type === 'json') {
        try {
          JSON.parse(brouillon[p.cle]);
        } catch {
          return toast.error(`« ${p.libelle ?? p.cle} » : JSON invalide`);
        }
      }
    }
    setEnvoi(true);
    try {
      if (liste.length === 1) {
        await api.put(`/admin/parametres/${liste[0].cle}`, { valeur: typer(liste[0], brouillon[liste[0].cle]) });
      } else {
        await api.put('/admin/parametres/lot', { valeurs: Object.fromEntries(liste.map((p) => [p.cle, typer(p, brouillon[p.cle])])) });
      }
      toast.success(`${liste.length} paramètre(s) enregistré(s)`);
      setBrouillon((b) => {
        const reste = { ...b };
        liste.forEach((p) => delete reste[p.cle]);
        return reste;
      });
      invalider('parametres');
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };

  const initialiser = async () => {
    try {
      const r = await api.post<{ crees: number }>('/admin/parametres/initialiser', {});
      toast.success(r.crees ? `${r.crees} paramètre(s) créé(s)` : 'Tous les paramètres existent déjà');
      invalider('parametres');
    } catch (e) {
      toast.error(e);
    }
  };

  if (q.isLoading) return <Loader />;
  if (q.error) return <ErrorBox error={q.error} />;

  const categories = [...new Set((q.data ?? []).map((p) => p.categorie))];
  const parCategorie = (q.data ?? [])
    .filter((p) => !categorie || p.categorie === categorie)
    .reduce<Record<string, Parametre[]>>((acc, p) => {
      (acc[p.categorie] ??= []).push(p);
      return acc;
    }, {});

  return (
    <>
      {!superAdmin && (
        <div className="alert info">
          <Icon name="lock" size={16} />
          <div>Lecture seule : seul un super administrateur peut modifier les réglages.</div>
        </div>
      )}
      <div className="toolbar">
        <Chips
          options={[{ value: '', label: 'Toutes' }, ...categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]}
          value={categorie}
          onChange={setCategorie}
        />
        {superAdmin && (
          <div className="actions" style={{ marginLeft: 'auto' }}>
            <button className="btn secondary" onClick={initialiser}><Icon name="refresh-cw" size={15} /> Créer les paramètres manquants</button>
            <button className="btn" disabled={!modifies.length || envoi} onClick={() => enregistrer(modifies)}>
              Enregistrer {modifies.length ? `(${modifies.length})` : ''}
            </button>
          </div>
        )}
      </div>

      {!q.data?.length && <Empty>Aucun paramètre en base : le backend utilise ses valeurs de repli. Utilisez « Créer les paramètres manquants ».</Empty>}

      {Object.entries(parCategorie).map(([cat, params]) => (
        <Card key={cat} title={cat.charAt(0).toUpperCase() + cat.slice(1)} flush>
          <div className="table-wrap">
            <table className="table-empilee">
              <tbody>
                {params.map((p) => {
                  const editable = superAdmin && p.modifiable;
                  const valeur = brouillon[p.cle] ?? p.valeur;
                  const change = (v: string) => setBrouillon({ ...brouillon, [p.cle]: v });
                  const modifie = valeur !== p.valeur;
                  const json = p.type === 'json' ? lireJson(valeur) : undefined;
                  return (
                    <tr key={p.id}>
                      <td style={{ width: '45%' }}>
                        <strong>{p.libelle ?? p.cle}</strong>
                        {modifie && <span className="small" style={{ color: 'var(--gold)' }}> · modifié</span>}
                        <div className="muted small">{p.description}</div>
                        <div className="mono muted" style={{ fontSize: '0.7rem' }}>{p.cle}</div>
                      </td>
                      <td>
                        {p.type === 'booleen' ? (
                          <select className="select" disabled={!editable} value={valeur} onChange={(e) => change(e.target.value)} style={{ maxWidth: 160 }}>
                            <option value="true">Oui</option>
                            <option value="false">Non</option>
                          </select>
                        ) : p.type === 'json' && ((estListeTextes(json) && (json.length || LISTES[p.cle])) || (LISTES[p.cle] && json == null)) ? (
                          <ListeJson cle={p.cle} valeur={valeur} editable={editable} onChange={change} />
                        ) : p.type === 'json' && (lireGrille(valeur) || (COLONNES_PAR_CLE[p.cle] && json == null)) ? (
                          <GrilleJson cle={p.cle} valeur={valeur} editable={editable} onChange={change} />
                        ) : p.type === 'json' && (estObjetPlat(json) || (CHAMPS_PAR_CLE[p.cle] && json == null)) ? (
                          <ObjetJson cle={p.cle} titre={p.libelle ?? p.cle} valeur={valeur} editable={editable} onChange={change} />
                        ) : p.type === 'json' ? (
                          <textarea className="textarea mono" disabled={!editable} value={valeur} onChange={(e) => change(e.target.value)} />
                        ) : (
                          <input className="input" type={p.type === 'nombre' ? 'number' : 'text'} step="any" disabled={!editable}
                            value={valeur} onChange={(e) => change(e.target.value)} style={{ maxWidth: 320 }} />
                        )}
                      </td>
                      <td style={{ width: 110 }}>
                        {editable && modifie && (
                          <button className="btn sm" disabled={envoi} onClick={() => enregistrer([p])}>Enregistrer</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  );
}

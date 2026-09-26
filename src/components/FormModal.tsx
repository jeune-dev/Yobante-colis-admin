import { useState, type ReactNode } from 'react';
import { Field, Modal, toast } from './ui';

/**
 * Formulaire déclaratif pour les écrans CRUD : on décrit les champs, le composant
 * gère la saisie, la conversion des types et l'envoi. Les champs vides sont omis
 * à la création et envoyés à `null` en modification (pour pouvoir effacer une valeur).
 */

export type Options = Record<string, string> | { value: string; label: string }[];

export interface ChampDef {
  name: string;
  label: string;
  type?:
    | 'text' | 'email' | 'tel' | 'password' | 'number' | 'date' | 'datetime-local' | 'time'
    | 'textarea' | 'select' | 'checkbox' | 'tags' | 'json' | 'file' | 'files' | 'multiselect';
  options?: Options;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  step?: string;
  /** Occupe toute la largeur (sinon deux champs par ligne). */
  full?: boolean;
  /** Masque le champ selon les autres valeurs. */
  visible?: (v: Valeurs) => boolean;
  disabled?: boolean;
  accept?: string;
}

export type Valeurs = Record<string, unknown>;

const listeOptions = (o?: Options) =>
  !o ? [] : Array.isArray(o) ? o : Object.entries(o).map(([value, label]) => ({ value, label }));

/** Valeur de saisie (chaîne) à partir d'une valeur API. */
const versSaisie = (c: ChampDef, v: unknown): unknown => {
  if (c.type === 'checkbox') return !!v;
  if (c.type === 'multiselect') return Array.isArray(v) ? v : [];
  if (c.type === 'file' || c.type === 'files') return null;
  if (v === null || v === undefined) return '';
  if (c.type === 'tags') return Array.isArray(v) ? v.join(', ') : String(v);
  if (c.type === 'json') return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  if (c.type === 'date') return String(v).slice(0, 10);
  if (c.type === 'datetime-local') {
    // L'API renvoie de l'UTC ; le champ attend une heure locale « AAAA-MM-JJTHH:mm »
    const d = new Date(String(v));
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
  return String(v);
};

/** Conversion vers le corps de requête. Renvoie `undefined` pour omettre le champ. */
const versApi = (c: ChampDef, saisie: unknown, initiale: unknown): unknown => {
  if (c.type === 'checkbox' || c.type === 'multiselect' || c.type === 'file' || c.type === 'files')
    return saisie ?? undefined;
  const s = String(saisie ?? '').trim();
  if (s === '') return initiale !== null && initiale !== undefined && initiale !== '' ? null : undefined;
  if (c.type === 'number') return Number(s);
  if (c.type === 'tags') return s.split(',').map((x) => x.trim()).filter(Boolean);
  if (c.type === 'json') return JSON.parse(s);
  return s;
};

export function construireCorps(champs: ChampDef[], saisies: Valeurs, initial: Valeurs = {}) {
  const corps: Valeurs = {};
  for (const c of champs) {
    if (c.visible && !c.visible(saisies)) continue;
    if (c.disabled) continue;
    const v = versApi(c, saisies[c.name], initial[c.name]);
    if (v !== undefined) corps[c.name] = v;
  }
  return corps;
}

export function ChampSaisie({
  c,
  valeur,
  onChange,
}: {
  c: ChampDef;
  valeur: unknown;
  onChange: (v: unknown) => void;
}) {
  const commun = { disabled: c.disabled, placeholder: c.placeholder };
  switch (c.type) {
    case 'textarea':
    case 'json':
      return (
        <textarea
          className={`textarea${c.type === 'json' ? ' mono' : ''}`}
          value={String(valeur ?? '')}
          onChange={(e) => onChange(e.target.value)}
          {...commun}
        />
      );
    case 'select':
      return (
        <select className="select" value={String(valeur ?? '')} onChange={(e) => onChange(e.target.value)} disabled={c.disabled}>
          {!c.required && <option value="">—</option>}
          {c.required && valeur === '' && <option value="">— Choisir —</option>}
          {listeOptions(c.options).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case 'multiselect': {
      const choix = (valeur as string[]) ?? [];
      return (
        <div className="chips">
          {listeOptions(c.options).map((o) => (
            <button
              type="button"
              key={o.value}
              className={`chip${choix.includes(o.value) ? ' active' : ''}`}
              onClick={() => onChange(choix.includes(o.value) ? choix.filter((x) => x !== o.value) : [...choix, o.value])}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    }
    case 'file':
    case 'files':
      return (
        <input
          className="input"
          type="file"
          accept={c.accept ?? 'image/jpeg,image/png,application/pdf'}
          multiple={c.type === 'files'}
          onChange={(e) => onChange(c.type === 'files' ? Array.from(e.target.files ?? []) : e.target.files?.[0] ?? null)}
        />
      );
    default:
      return (
        <input
          className="input"
          type={c.type === 'tags' ? 'text' : c.type ?? 'text'}
          step={c.step ?? (c.type === 'number' ? 'any' : undefined)}
          value={String(valeur ?? '')}
          onChange={(e) => onChange(e.target.value)}
          {...commun}
        />
      );
  }
}

export function FormModal({
  title,
  champs,
  initial = {},
  onSubmit,
  onClose,
  submitLabel = 'Enregistrer',
  large,
  danger,
  intro,
  succes,
}: {
  title: string;
  champs: ChampDef[];
  initial?: Valeurs;
  /** Reçoit le corps prêt à envoyer. */
  onSubmit: (corps: Valeurs) => Promise<unknown>;
  onClose: () => void;
  submitLabel?: string;
  large?: boolean;
  danger?: boolean;
  intro?: ReactNode;
  /** Message de succès ; `false` pour ne rien afficher. */
  succes?: string | false;
}) {
  const [saisies, setSaisies] = useState<Valeurs>(() =>
    Object.fromEntries(champs.map((c) => [c.name, versSaisie(c, initial[c.name])]))
  );
  const [envoi, setEnvoi] = useState(false);

  const visibles = champs.filter((c) => !c.visible || c.visible(saisies));

  const valider = async () => {
    const manquant = visibles.find((c) => {
      if (!c.required) return false;
      const v = saisies[c.name];
      return v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length);
    });
    if (manquant) return toast.error(`« ${manquant.label} » est obligatoire`);

    let corps: Valeurs;
    try {
      corps = construireCorps(champs, saisies, initial);
    } catch {
      return toast.error('JSON invalide');
    }
    setEnvoi(true);
    try {
      await onSubmit(corps);
      if (succes !== false) toast.success(succes ?? 'Enregistré');
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      large={large}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>Annuler</button>
          <button className={`btn${danger ? ' danger' : ''}`} onClick={valider} disabled={envoi}>
            {envoi ? 'Envoi…' : submitLabel}
          </button>
        </>
      }
    >
      {intro && <div style={{ marginBottom: 12 }}>{intro}</div>}
      <div className="form-row">
        {visibles.map((c) =>
          c.type === 'checkbox' ? (
            <label key={c.name} className="check" style={{ gridColumn: '1 / -1' }}>
              <input
                type="checkbox"
                checked={!!saisies[c.name]}
                disabled={c.disabled}
                onChange={(e) => setSaisies({ ...saisies, [c.name]: e.target.checked })}
              />
              {c.label}
            </label>
          ) : (
            <div
              key={c.name}
              style={{
                gridColumn:
                  c.full || ['textarea', 'json', 'multiselect', 'files'].includes(c.type ?? '') ? '1 / -1' : undefined,
              }}
            >
              <Field label={`${c.label}${c.required ? ' *' : ''}`} hint={c.hint}>
                <ChampSaisie c={c} valeur={saisies[c.name]} onChange={(v) => setSaisies({ ...saisies, [c.name]: v })} />
              </Field>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

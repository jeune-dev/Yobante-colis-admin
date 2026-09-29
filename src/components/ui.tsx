import { Fragment, cloneElement, isValidElement, useEffect, useId, useRef, useState, type KeyboardEvent as KeyEvt, type ReactElement, type ReactNode } from 'react';
import { create } from 'zustand';
import Icon from './Icon';
import type { Ton } from '@/lib/labels';

/* ── Badges ─────────────────────────────────────────────────────────────── */

export function Badge({ ton = 'gris', children }: { ton?: Ton; children: ReactNode }) {
  return <span className={`badge t-${ton}`}>{children}</span>;
}

/** Badge piloté par une table de libellés { cle: { label, ton } }. */
export function StatutBadge({
  table,
  valeur,
}: {
  table: Record<string, { label: string; ton: Ton }>;
  valeur?: string | null;
}) {
  if (!valeur) return <span className="muted">—</span>;
  const s = table[valeur];
  return <Badge ton={s?.ton ?? 'gris'}>{s?.label ?? valeur}</Badge>;
}

/* ── États de chargement ─────────────────────────────────────────────────── */

export const Loader = () => (
  <div className="loader">
    <div className="spinner" />
  </div>
);

/**
 * Message présentable d'une erreur. Les erreurs d'API (ApiError) et celles levées
 * volontairement (`new Error('…')`) portent un texte destiné à l'utilisateur ; une
 * erreur JavaScript (TypeError « Cannot read properties of undefined »…) est un bug :
 * on n'en montre pas le détail technique.
 */
export const messageErreur = (e: unknown): string => {
  if (e instanceof TypeError || e instanceof ReferenceError || e instanceof SyntaxError || e instanceof RangeError)
    return 'Une erreur inattendue est survenue. Rechargez la page et réessayez.';
  if (e instanceof Error) return e.message || 'Une erreur inattendue est survenue.';
  return typeof e === 'string' && e ? e : 'Une erreur inattendue est survenue.';
};

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  const message = messageErreur(error);
  return (
    <div className="alert error" role="alert">
      <Icon name="alert-triangle" size={16} />
      <div>{message}</div>
      {onRetry && (
        <button type="button" className="btn secondary sm" style={{ marginLeft: 'auto' }} onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export const Empty = ({ children = 'Aucun résultat' }: { children?: ReactNode }) => (
  <div className="empty">{children}</div>
);

/**
 * Ligne de tableau cliquable utilisable au clavier : atteinte par Tab, activée par
 * Entrée ou Espace. Les touches frappées dans un élément interne (case à cocher,
 * bouton) sont ignorées pour ne pas déclencher l'action de la ligne.
 */
export const ligneCliquable = (action: () => void) => ({
  onClick: action,
  tabIndex: 0,
  onKeyDown: (e: KeyEvt) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    action();
  },
});

/* ── Cartes ──────────────────────────────────────────────────────────────── */

export function Card({
  title,
  right,
  children,
  flush,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="card">
      {title && (
        <div className="card-head">
          <div className="card-title">{title}</div>
          {right && <div className="right">{right}</div>}
        </div>
      )}
      {flush ? children : <div className="card-body">{children}</div>}
    </div>
  );
}

export function Stat({
  icon,
  ton = 'bleu',
  value,
  label,
  hint,
  onClick,
}: {
  icon: string;
  ton?: Ton;
  value: ReactNode;
  label: string;
  hint?: ReactNode;
  onClick?: () => void;
}) {
  // Carte cliquable utilisable au clavier (Tab puis Entrée/Espace)
  const clavier = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: KeyEvt) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()),
      }
    : {};
  return (
    <div className={`stat${onClick ? ' cliquable' : ''}`} onClick={onClick} {...clavier}>
      <div className={`stat-icon t-${ton}`}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="kv-label">{label}</div>
      <div className="kv-value">{children ?? '—'}</div>
    </div>
  );
}

/* ── Modale ──────────────────────────────────────────────────────────────── */

export function Modal({
  title,
  onClose,
  children,
  footer,
  large,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  large?: boolean;
}) {
  const titreId = useId();
  const boite = useRef<HTMLDivElement>(null);
  // `onClose` est souvent une fonction recréée à chaque rendu : on garde la dernière
  // sans relancer l'effet (qui déplacerait le focus à chaque frappe).
  const fermer = useRef(onClose);
  fermer.current = onClose;
  // Élément actif avant l'ouverture (lu au premier rendu, avant tout autoFocus interne)
  const [precedent] = useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    const racine = boite.current;
    // Focus dans la boîte de dialogue (sauf si un champ `autoFocus` l'a déjà pris) :
    // premier champ, sinon la boîte elle-même
    if (!racine?.contains(document.activeElement)) {
      const premier = racine?.querySelector<HTMLElement>('.modal-body input, .modal-body select, .modal-body textarea');
      (premier ?? racine)?.focus();
    }

    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return fermer.current();
      if (e.key !== 'Tab' || !racine) return;
      // Le focus reste piégé dans la modale (navigation clavier)
      const focusables = Array.from(
        racine.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (!focusables.length) return;
      const [debut, fin] = [focusables[0], focusables[focusables.length - 1]];
      if (e.shiftKey && document.activeElement === debut) { e.preventDefault(); fin.focus(); }
      else if (!e.shiftKey && document.activeElement === fin) { e.preventDefault(); debut.focus(); }
    };
    window.addEventListener('keydown', clavier);
    return () => {
      window.removeEventListener('keydown', clavier);
      precedent?.focus?.();
    };
  }, [precedent]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={boite} className={`modal${large ? ' large' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titreId} tabIndex={-1}>
        <div className="modal-head">
          <div className="modal-title" id={titreId}>{title}</div>
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────────── */

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export function Pagination({
  info,
  onPage,
}: {
  info?: PaginationInfo;
  onPage: (p: number) => void;
}) {
  if (!info) return null;
  const { currentPage: p, totalPages, totalItems } = info;
  return (
    <div className="pagination">
      <span>
        {totalItems} élément{totalItems > 1 ? 's' : ''}
      </span>
      <span className="spacer" />
      <button className="btn secondary sm" disabled={p <= 1} onClick={() => onPage(p - 1)} aria-label="Page précédente">
        <Icon name="chevron-left" size={14} />
      </button>
      <span>
        Page {p} / {Math.max(totalPages, 1)}
      </span>
      <button
        className="btn secondary sm"
        disabled={p >= totalPages}
        onClick={() => onPage(p + 1)}
        aria-label="Page suivante"
      >
        <Icon name="chevron-right" size={14} />
      </button>
    </div>
  );
}

/* ── Champs de formulaire ────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  // Associe le libellé au champ (lecteurs d'écran, clic sur le libellé) : l'enfant
  // unique reçoit un id s'il n'en a pas. Un contenu composite garde un libellé simple.
  const idAuto = useId();
  let champ = children;
  let cible: string | undefined;
  if (isValidElement(children) && children.type !== Fragment) {
    const el = children as ReactElement<{ id?: string }>;
    cible = el.props.id ?? idAuto;
    if (!el.props.id) champ = cloneElement(el, { id: cible });
  }
  return (
    <div className="field">
      <label htmlFor={cible}>{label}</label>
      {champ}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  // Saisie locale, propagée après une courte pause pour ne pas lancer une requête par touche
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => local !== value && onChange(local), 350);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

  return (
    <div className="search">
      <Icon name="search" size={15} />
      <input
        className="input"
        value={local}
        placeholder={placeholder}
        aria-label={placeholder ?? 'Rechercher'}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip${value === o.value ? ' active' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Notifications ───────────────────────────────────────────────────────── */

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void }>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4500);
  },
}));

export const toast = {
  success: (message: string) => useToasts.getState().push({ message, type: 'success' }),
  error: (e: unknown) => useToasts.getState().push({ message: messageErreur(e), type: 'error' }),
};

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    // Annoncé par les lecteurs d'écran sans déplacer le focus
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : undefined}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

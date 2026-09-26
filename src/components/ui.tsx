import { useEffect, useState, type ReactNode } from 'react';
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

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="alert error">
      <Icon name="alert-triangle" size={16} />
      <div>{message}</div>
    </div>
  );
}

export const Empty = ({ children = 'Aucun résultat' }: { children?: ReactNode }) => (
  <div className="empty">{children}</div>
);

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
  return (
    <div className={`stat${onClick ? ' cliquable' : ''}`} onClick={onClick}>
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
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${large ? ' large' : ''}`}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
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
      <button className="btn secondary sm" disabled={p <= 1} onClick={() => onPage(p - 1)}>
        <Icon name="chevron-left" size={14} />
      </button>
      <span>
        Page {p} / {Math.max(totalPages, 1)}
      </span>
      <button
        className="btn secondary sm"
        disabled={p >= totalPages}
        onClick={() => onPage(p + 1)}
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
  return (
    <div className="field">
      <label>{label}</label>
      {children}
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
          className={`chip${value === o.value ? ' active' : ''}`}
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
  error: (e: unknown) =>
    useToasts
      .getState()
      .push({ message: e instanceof Error ? e.message : String(e), type: 'error' }),
};

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

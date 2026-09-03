import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { statusLabel, statusTone } from '../lib/status.js';
import { IconAlert, IconCheck, IconInfo, IconX } from './Icons.jsx';

/* ------------------------------------------------------------------ chips */

export function Status({ code, label, tone, context, plain = false }) {
  if (!code && !label) return <span className="muted">—</span>;
  const t = tone || statusTone(code);
  return (
    <span className={`chip chip--${t}${plain ? ' chip--plain' : ''}`}>
      {label || statusLabel(code, context)}
    </span>
  );
}

export function Tag({ children }) {
  return <span className="tag">{children}</span>;
}

/* ----------------------------------------------------------------- layout */

export function Card({ title, subtitle, actions, children, flush = false, foot, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card__head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <div className="xs muted mt-2">{subtitle}</div>}
          </div>
          {actions && <div className="row gap-2">{actions}</div>}
        </header>
      )}
      <div className={`card__body${flush ? ' card__body--flush' : ''}`}>{children}</div>
      {foot && <footer className="card__foot">{foot}</footer>}
    </section>
  );
}

export function Tile({ label, value, foot, accent }) {
  return (
    <div className={`tile${accent ? ` tile--${accent}` : ''}`}>
      <div className="tile__label">{label}</div>
      <div className="tile__value">{value}</div>
      {foot && <div className="tile__foot">{foot}</div>}
    </div>
  );
}

export function PageHead({ title, lede, actions, children }) {
  return (
    <div className="pagehead">
      <div className="grow">
        <h1>{title}</h1>
        {lede && <p>{lede}</p>}
        {children}
      </div>
      {actions && <div className="row gap-2 wrap">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', title, children, icon = true }) {
  const Glyph = tone === 'success' ? IconCheck : tone === 'info' || tone === 'legal' ? IconInfo : IconAlert;
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      {icon && <Glyph className="notice__icon" width={16} height={16} />}
      <div>
        {title && <div className="strong" style={{ marginBottom: 2 }}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Bar({ value, tone }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const cls = tone || (v >= 100 ? 'green' : v >= 60 ? '' : v >= 30 ? 'amber' : 'red');
  return (
    <div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar__fill${cls ? ` bar__fill--${cls}` : ''}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function DL({ items, tight = false }) {
  return (
    <dl className={`dl${tight ? ' dl--tight' : ''}`}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v ?? <span className="muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          className={`tab${value === t.key ? ' tab--on' : ''}`}
          onClick={() => onChange(t.key)}
          type="button"
        >
          {t.label}
          {t.count !== undefined && <span className="muted"> ({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ table */

export function DataTable({ columns, rows, empty, onRowClick, rowKey = (r, i) => r.id ?? i }) {
  if (!rows?.length) return <Empty title={empty?.title || 'No records'}>{empty?.body}</Empty>;
  return (
    <div className="tablewrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined} className={c.align === 'right' ? 'right' : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={rowKey(r, i)}
              className={onRowClick ? 'clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={[c.align === 'right' ? 'num' : '', c.mono ? 'code' : ''].filter(Boolean).join(' ')}>
                  {c.render ? c.render(r, i) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({ label, hint, error, required, children, id }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}{required && <span className="req" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div className="field__hint">{hint}</div>}
      {error && <div className="field__error" role="alert">{error}</div>}
    </div>
  );
}

export function Input({ id, ...props }) {
  return <input id={id} className="input" {...props} />;
}

export function Textarea({ id, ...props }) {
  return <textarea id={id} className="textarea" {...props} />;
}

export function Select({ id, options, placeholder, ...props }) {
  return (
    <select id={id} className="select" {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const value = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  );
}

export function CheckLine({ checked, onChange, title, children }) {
  return (
    <label className="checkline">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="checkline__text">
        <span className="strong">{title}</span>
        {children && <div className="muted xs mt-2">{children}</div>}
      </span>
    </label>
  );
}

export function TagPicker({ options, value = [], onChange, max }) {
  const toggle = (t) => {
    if (value.includes(t)) onChange(value.filter((x) => x !== t));
    else if (!max || value.length < max) onChange([...value, t]);
  };
  return (
    <div className="taggrid">
      {options.map((t) => (
        <button
          key={t}
          type="button"
          className={`tagpick${value.includes(t) ? ' tagpick--on' : ''}`}
          onClick={() => toggle(t)}
          aria-pressed={value.includes(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function Button({ variant = 'secondary', size, block, loading, children, ...props }) {
  return (
    <button
      type="button"
      className={[
        'btn', `btn--${variant}`,
        size ? `btn--${size}` : '',
        block ? 'btn--block' : '',
      ].filter(Boolean).join(' ')}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({ open, title, subtitle, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__head">
          <div>
            <h3>{title}</h3>
            {subtitle && <div className="xs muted mt-2">{subtitle}</div>}
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><IconX width={16} height={16} /></button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- toasts */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, message, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({
    push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.tone !== 'default' ? ` toast--${t.tone}` : ''}`}>
            {t.tone === 'success' ? <IconCheck width={15} height={15} /> : t.tone === 'error' ? <IconAlert width={15} height={15} /> : <IconInfo width={15} height={15} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/* --------------------------------------------------------------- loading */

export function Loading({ rows = 4, label = 'Loading' }) {
  return (
    <div className="stack gap-3" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel" style={{ height: i === 0 ? 30 : 18, width: i === 0 ? '38%' : `${100 - i * 7}%` }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Notice tone="danger" title="Could not load this view">
      {error?.message || 'Unexpected error.'}
      {onRetry && (
        <div className="mt-3">
          <Button size="sm" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </Notice>
  );
}

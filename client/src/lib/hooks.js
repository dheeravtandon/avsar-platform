import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/** Fetch-on-mount with refetch, cancellation and an error surface. */
export function useApi(path, deps = [], { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (skip || !path) { setLoading(false); return undefined; }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api.get(path, { signal: ctrl.signal })
      .then((res) => { if (mounted.current) { setData(res); setError(null); } })
      .catch((err) => { if (err.name !== 'AbortError' && mounted.current) setError(err); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, skip, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}

/** Debounced value - used by every search box. */
export function useDebounced(value, delay = 280) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | AVSAR` : 'AVSAR';
    return () => { document.title = prev; };
  }, [title]);
}

/** Close on Escape and on outside click - used by menus and drawers. */
export function useDismiss(ref, onDismiss, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onDismiss(); };
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onDismiss(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [ref, onDismiss, active]);
}

import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useApi, useDebounced, useDocumentTitle } from '../lib/hooks.js';
import { api, endpoints, qs } from '../lib/api.js';
import { usePerms } from '../lib/auth.jsx';
import { inr, date } from '../lib/format.js';
import {
  Button, Card, DataTable, Empty, ErrorState, Field, Input, Loading, Modal,
  Notice, PageHead, Status, Tile, useToast,
} from '../components/ui.jsx';
import { IconCheck, IconSearch } from '../components/Icons.jsx';

export default function Catalogue() {
  useDocumentTitle('Proven solutions');
  const perms = usePerms();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi(endpoints.catalogue(qs({ q })), [q]);
  const [adopt, setAdopt] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const rows = data ?? [];
  const totalAdoptions = rows.reduce((s, r) => s + Number(r.adoptions || 0), 0);

  const doAdopt = async () => {
    setBusy(true);
    try {
      const res = await api.post(endpoints.adopt(adopt.id), { quantity: Number(qty) });
      toast.success(`Adoption raised for ${inr(res.value)} — ${res.savedSteps.join(', ')} not repeated`);
      setAdopt(null); setQty(1);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell crumbs={[{ label: 'Proven solutions' }]}>
      <PageHead
        title="Proven Solutions Registry"
        lede="Solutions that cleared a funded pilot and were procured. Any department can draw one down against the published rate contract without repeating discovery, evaluation or pilot."
      />

      <div className="grid grid--3 mb-6">
        <Tile label="Solutions listed" value={rows.length} accent="green" />
        <Tile label="Cross-department adoptions" value={totalAdoptions} accent="accent" />
        <Tile label="Stages skipped per adoption" value="3" foot="Discovery, evaluation, pilot" accent="saffron" />
      </div>

      <div className="toolbar">
        <div className="row gap-2 toolbar__search">
          <IconSearch width={15} height={15} className="muted" />
          <Input placeholder="Search proven solutions" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="grow" />
        <span className="xs muted">{rows.length} listed</span>
      </div>

      <div className="card" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)', padding: 'var(--s-5)' }}>
        {loading && <Loading rows={4} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {!loading && !error && (rows.length ? (
          <div className="stack gap-4">
            {rows.map((r) => (
              <article key={r.id} className="card">
                <div className="card__head">
                  <div>
                    <div className="row gap-3 mb-2 wrap">
                      <span className="code mono">{r.code}</span>
                      <Status code={r.status} />
                      <span className="xs muted">Rate contract to {date(r.rate_contract_valid_till)}</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>{r.solution_name}</h3>
                    <div className="small muted mt-2">
                      {r.brand_name || r.legal_name} · {r.category} · proven at {r.proven_dept_name}
                    </div>
                  </div>
                  <div className="right">
                    <div className="serif tnum" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{inr(r.unit_price)}</div>
                    <div className="xs muted">{r.uom}</div>
                  </div>
                </div>

                <div className="card__body">
                  <p className="reading dim small">{r.description}</p>
                  {(r.proven_kpi ?? []).length > 0 && (
                    <>
                      <div className="capline mt-5 mb-3">Measured in the pilot</div>
                      <div className="grid grid--3">
                        {r.proven_kpi.map((k) => (
                          <div key={k.kpi_key} className="tile">
                            <div className="tile__label">{k.kpi_label}</div>
                            <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                              <span className="tile__value" style={{ fontSize: 'var(--text-xl)' }}>{k.actual_value}</span>
                              <span className="xs muted">{k.unit}</span>
                              <IconCheck width={14} height={14} style={{ color: 'var(--green-600)' }} />
                            </div>
                            <div className="tile__foot">Target {k.target_value} {k.unit}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="card__foot row between wrap gap-3">
                  <span className="small">
                    <b>{r.adoptions}</b> department{r.adoptions === 1 ? '' : 's'} have drawn down this contract
                    <span className="muted"> · {r.gfr_rule}</span>
                  </span>
                  {!perms.isStartup && (
                    <Button variant="primary" size="sm" onClick={() => setAdopt(r)}>Adopt for my department</Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Nothing listed yet">
            A solution appears here once a pilot has cleared its KPIs and a rate contract has been executed.
          </Empty>
        ))}
      </div>

      <Modal
        open={!!adopt}
        title="Adopt this solution"
        subtitle={adopt?.solution_name}
        onClose={() => setAdopt(null)}
        footer={
          <>
            <Button onClick={() => setAdopt(null)}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={doAdopt}>Raise adoption</Button>
          </>
        }
      >
        {adopt && (
          <>
            <div className="mb-4">
              <Notice tone="success" title="What you are skipping">
                Discovery, committee evaluation and a funded pilot were completed by {adopt.proven_dept_name}.
                Your department records its own quantity and sanction against the price already discovered.
              </Notice>
            </div>
            <Field label="Quantity" required hint={`${inr(adopt.unit_price)} ${adopt.uom}`}>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <div className="tile tile--accent">
              <div className="tile__label">Estimated value</div>
              <div className="tile__value">{inr(Number(adopt.unit_price) * Number(qty || 0))}</div>
              <div className="tile__foot">Under {adopt.gfr_rule}</div>
            </div>
          </>
        )}
      </Modal>
    </AppShell>
  );
}

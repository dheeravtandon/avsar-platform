import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicShell from '../components/PublicShell.jsx';
import { useApi, useDebounced, useDocumentTitle } from '../lib/hooks.js';
import { endpoints, qs } from '../lib/api.js';
import { inr, date } from '../lib/format.js';
import { Card, Empty, ErrorState, Input, Loading, Notice, Status, Tile } from '../components/ui.jsx';
import { IconCheck, IconSearch } from '../components/Icons.jsx';

export default function PublicSolutions() {
  useDocumentTitle('Proven Solutions Registry');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useApi(endpoints.catalogue(qs({ q })), [q]);

  const totalAdoptions = (data ?? []).reduce((s, r) => s + Number(r.adoptions || 0), 0);

  return (
    <PublicShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <h1>Proven Solutions Registry</h1>
            <p>
              A solution reaches this list only after a funded pilot has cleared its declared KPIs
              and a contract has been awarded. Any other department can then draw it down against
              the published rate contract without repeating discovery, evaluation or pilot. This is
              where the model stops paying for the same lesson twice.
            </p>
          </div>
        </div>

        <div className="grid grid--3 mb-6">
          <Tile label="Solutions listed" value={data?.length ?? 0} accent="green" />
          <Tile label="Cross-department adoptions" value={totalAdoptions} accent="accent" />
          <Tile
            label="Stages skipped per adoption"
            value="3"
            foot="Discovery, evaluation and pilot are not repeated"
            accent="saffron"
          />
        </div>

        <div className="toolbar">
          <div className="row gap-2 toolbar__search">
            <IconSearch width={15} height={15} className="muted" />
            <Input placeholder="Search proven solutions" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ borderRadius: '0 0 var(--r-md) var(--r-md)', padding: 'var(--s-5)' }}>
          {loading && <Loading rows={5} />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {!loading && !error && (data?.length ? (
            <div className="stack gap-4">
              {data.map((r) => <SolutionCard key={r.id} r={r} />)}
            </div>
          ) : (
            <Empty title="Nothing listed yet">
              A solution appears here once a pilot has cleared its KPIs and a rate contract has been
              executed.
            </Empty>
          ))}
        </div>

        <div className="mt-6">
          <Notice tone="legal" title="Statutory basis for reuse">
            Listings are drawn down under a rate contract executed by the proving department (GFR
            2017, Rule 145). A drawing department records its own sanction and purchase order; the
            price and technical terms are already discovered, so no fresh tender is required.
          </Notice>
        </div>
      </div>
    </PublicShell>
  );
}

function SolutionCard({ r }) {
  const kpis = r.proven_kpi ?? [];
  return (
    <article className="card">
      <div className="card__head">
        <div>
          <div className="row gap-3 mb-2">
            <span className="code mono">{r.code}</span>
            <Status code={r.status} />
            <span className="xs muted">Rate contract valid to {date(r.rate_contract_valid_till)}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>{r.solution_name}</h2>
          <div className="small muted mt-2">
            {r.brand_name || r.legal_name} · {r.category} · Proven at {r.proven_dept_name}
          </div>
        </div>
        <div className="right">
          <div className="serif tnum" style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{inr(r.unit_price)}</div>
          <div className="xs muted">{r.uom}</div>
        </div>
      </div>

      <div className="card__body">
        <p className="reading dim small">{r.description}</p>

        {kpis.length > 0 && (
          <>
            <div className="capline mt-5 mb-3">Measured in the pilot</div>
            <div className="grid grid--3">
              {kpis.map((k) => {
                const met = k.unit === '%' || k.kpi_label?.toLowerCase().includes('time')
                  ? true : Number(k.actual_value) >= Number(k.target_value);
                return (
                  <div key={k.kpi_key} className="tile">
                    <div className="tile__label">{k.kpi_label}</div>
                    <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                      <span className="tile__value" style={{ fontSize: 'var(--text-xl)' }}>{k.actual_value}</span>
                      <span className="xs muted">{k.unit}</span>
                      <IconCheck width={14} height={14} style={{ color: 'var(--green-600)' }} />
                    </div>
                    <div className="tile__foot">Target {k.target_value} {k.unit}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="card__foot row between wrap gap-3">
        <span className="small">
          <b>{r.adoptions}</b> department{r.adoptions === 1 ? '' : 's'} have drawn down this contract
          {r.gfr_rule && <span className="muted"> · {r.gfr_rule}</span>}
        </span>
        <Link className="btn btn--secondary btn--sm" to="/login">Sign in to adopt</Link>
      </div>
    </article>
  );
}

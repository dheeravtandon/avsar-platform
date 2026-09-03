import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, Legend,
} from 'recharts';
import PublicShell from '../components/PublicShell.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { endpoints } from '../lib/api.js';
import { inr, num, date } from '../lib/format.js';
import { Card, DataTable, ErrorState, Loading, Notice, Tile } from '../components/ui.jsx';

const SERIES = ['#0b2447', '#19406f', '#22548c', '#05639e', '#0a7ac2', '#e08a1e', '#c26a0d'];

export default function PublicDashboard() {
  useDocumentTitle('Transparency board');
  const { data, loading, error, reload } = useApi(endpoints.publicDashboard(), []);

  if (loading || (!data && !error)) return <PublicShell><div className="page"><Loading rows={6} /></div></PublicShell>;
  if (error || !data) return <PublicShell><div className="page"><ErrorState error={error} onRetry={reload} /></div></PublicShell>;

  const { headline: h, funnel, conversion, bySector, byDepartment, cycleTime, payments, provenSolutions } = data;

  const cycleData = [
    { name: 'Published → first application', days: cycleTime.publishToApplyDays ?? 0 },
    { name: 'Application → pilot sanctioned', days: cycleTime.applyToPilotDays ?? 0 },
    { name: 'Pilot → procurement raised', days: cycleTime.pilotToProcureDays ?? 0 },
  ];
  const avsarTotal = cycleData.reduce((s, x) => s + x.days, 0);

  return (
    <PublicShell>
      <div className="page">
        <div className="pagehead">
          <div>
            <h1>Transparency board</h1>
            <p>
              Every problem statement, pilot and contract on the platform, counted the same way for
              everyone. Figures refresh from the live database; the demonstration dataset is synthetic.
            </p>
          </div>
          <div className="xs muted nowrap">Generated {date(data.generatedAt, { withTime: true })}</div>
        </div>

        <div className="grid grid--5 mb-6">
          <Tile label="Departments participating" value={num(h.departments)} accent="accent" />
          <Tile label="Startups registered" value={num(h.startups)} foot={`${num(h.eligibleStartups)} cleared the statutory gate`} />
          <Tile label="Open problem statements" value={num(h.openChallenges)} accent="saffron" />
          <Tile label="Sanctioned pilot value" value={inr(h.pilotValue)} foot={`${num(h.activePilots)} pilots currently running`} />
          <Tile label="Contract value awarded" value={inr(h.contractValue)} accent="green" foot={`${num(h.firstTimeSuppliers)} first-time government suppliers`} />
        </div>

        <div className="grid grid--sidebar mb-6">
          <Card title="Conversion funnel" subtitle="Where applications go, including the ones that stop">
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="var(--ink-200)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category" dataKey="stage" width={210}
                  tick={{ fontSize: 11, fill: 'var(--ink-600)' }} axisLine={false} tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--brand-050)' }} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={16}>
                  {funnel.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: 'var(--ink-600)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="stack gap-4">
            <Card title="Conversion rates">
              <div className="stack gap-4">
                <Ratio label="Application to pilot" value={conversion.applicationToPilot} />
                <Ratio label="Pilot to procurement" value={conversion.pilotToProcurement} />
              </div>
              <div className="mt-4">
                <Notice tone="legal">
                  A low application-to-pilot rate is expected and healthy: the model is designed to fund a
                  small number of pilots properly rather than many thinly.
                </Notice>
              </div>
            </Card>

            <Card title="Payment discipline" subtitle="MSMED Act 2006, s.15 — 45 days from acceptance">
              <div className="grid grid--3">
                <Tile label="Settled" value={num(payments.paid)} />
                <Tile label="Outstanding" value={num(payments.due)} />
                <Tile label="Past 45 days" value={num(payments.breached)} accent={payments.breached ? 'saffron' : 'green'} />
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid--2 mb-6">
          <Card title="Cycle time" subtitle="Median days at each handoff, against a conventional tender">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={cycleData} margin={{ left: -18, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--ink-200)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} unit="d" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--brand-050)' }} formatter={(v) => [`${v} days`, 'Median']} />
                <Bar dataKey="days" fill="var(--brand-600)" radius={[3, 3, 0, 0]} barSize={44} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4">
              <Notice tone={avsarTotal && avsarTotal < cycleTime.conventionalTenderDays ? 'success' : 'info'}>
                <b>{avsarTotal} days</b> median from publication to a procurement being raised on this platform,
                against a working benchmark of <b>{cycleTime.conventionalTenderDays} days</b> for a conventional
                open tender of comparable value.
              </Notice>
            </div>
          </Card>

          <Card title="Where the demand is" subtitle="Problem statements and pilots by sector">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={bySector} margin={{ left: -18, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--ink-200)" />
                <XAxis dataKey="sector" tick={{ fontSize: 9, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} interval={0} angle={-14} textAnchor="end" height={54} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--brand-050)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="challenges" name="Problem statements" fill="var(--brand-600)" radius={[3, 3, 0, 0]} barSize={16} />
                <Bar dataKey="pilots" name="Pilots" fill="var(--saffron-500)" radius={[3, 3, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid grid--2">
          <Card title="Department activity" flush>
            <DataTable
              columns={[
                { key: 'department', header: 'Department', render: (r) => (<><span className="cell-title">{r.department}</span><span className="cell-sub">{r.ministry}</span></>) },
                { key: 'challenges', header: 'Statements', align: 'right' },
                { key: 'procured', header: 'Procured', align: 'right' },
              ]}
              rows={byDepartment}
              empty={{ title: 'No departments yet' }}
            />
          </Card>

          <Card title="Proven Solutions Registry" subtitle="Cleared a pilot, under a live rate contract" flush>
            <DataTable
              columns={[
                { key: 'solution_name', header: 'Solution', render: (r) => (<><span className="cell-title">{r.solution_name}</span><span className="cell-sub">{r.brand_name} · {r.category}</span></>) },
                { key: 'adoptions', header: 'Departments', align: 'right' },
              ]}
              rows={provenSolutions}
              empty={{ title: 'Nothing listed yet', body: 'A solution appears here once a pilot has cleared its KPIs and a contract has been awarded.' }}
            />
          </Card>
        </div>

        <div className="mt-6">
          <Notice tone="legal" title="How to read this page">
            Counts are taken directly from the transactional tables, not from a reporting copy. The
            audit trail behind each figure is hash-chained, so a retrospective edit to any past
            record breaks the chain and is detectable by the platform administrator and by audit.
          </Notice>
        </div>
      </div>
    </PublicShell>
  );
}

function Ratio({ label, value }) {
  return (
    <div>
      <div className="row between mb-2">
        <span className="small strong">{label}</span>
        <span className="serif tnum" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{value}%</span>
      </div>
      <div className="bar"><div className="bar__fill" style={{ width: `${Math.min(100, value)}%` }} /></div>
    </div>
  );
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid var(--ink-200)',
  boxShadow: 'var(--shadow-md)',
};

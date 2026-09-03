const STAGES = [
  { key: 'ASSESS', letter: 'A', label: 'Assess', blurb: 'Outcome-based problem statement, approved and published' },
  { key: 'VALIDATE', letter: 'V', label: 'Validate', blurb: 'Statutory eligibility gate, then committee evaluation' },
  { key: 'SANDBOX', letter: 'S', label: 'Sandbox', blurb: 'Funded, time-boxed pilot measured against declared KPIs' },
  { key: 'ADOPT', letter: 'A', label: 'Adopt', blurb: 'Procurement justified by pilot evidence' },
  { key: 'RAMPUP', letter: 'R', label: 'Ramp-up', blurb: 'Rate contract and cross-department reuse' },
];

export { STAGES };

export default function Stepper({ current }) {
  const idx = STAGES.findIndex((s) => s.key === current);
  return (
    <div className="stepper card" style={{ overflow: 'hidden' }}>
      {STAGES.map((s, i) => (
        <div
          key={s.key}
          className={`step${i < idx ? ' step--done' : ''}${i === idx ? ' step--current' : ''}`}
          aria-current={i === idx ? 'step' : undefined}
        >
          <div className="step__k">{s.letter} · Stage {i + 1}</div>
          <div className="step__label">{s.label}</div>
          <div className="step__blurb">{s.blurb}</div>
        </div>
      ))}
    </div>
  );
}

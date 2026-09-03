import { Component } from 'react';

/**
 * Last line of defence. A render error in one page should show a readable
 * message and a way back, not a blank white screen in the middle of a demo.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[avsar] render error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="page" style={{ paddingTop: 'var(--s-16)' }}>
        <div className="card reading" style={{ margin: '0 auto' }}>
          <div className="card__head">
            <h2>This page could not be displayed</h2>
          </div>
          <div className="card__body">
            <p className="muted small">
              Something went wrong while rendering. The record itself is unaffected — nothing has been
              written or lost.
            </p>
            <pre
              className="mono xs"
              style={{
                marginTop: 'var(--s-4)', padding: 'var(--s-3)', overflowX: 'auto',
                background: 'var(--ink-050)', border: 'var(--line)', borderRadius: 'var(--r-sm)',
                color: 'var(--red-700)',
              }}
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </div>
          <div className="card__foot row gap-3">
            <button className="btn btn--primary btn--sm" onClick={() => window.location.reload()}>Reload</button>
            <a className="btn btn--secondary btn--sm" href="/">Back to the public site</a>
          </div>
        </div>
      </div>
    );
  }
}

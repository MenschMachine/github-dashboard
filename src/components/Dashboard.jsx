import { useState, useEffect } from 'react';
import { fetchDashboardData } from '../github.js';
import StatsBar from './StatsBar';
import RepositoryCard from './RepositoryCard';
import './Dashboard.css';

const LS_TOKEN_KEY = 'gh-dashboard-token';
const LS_PATTERNS_KEY = 'gh-dashboard-patterns';
const DEFAULT_PATTERNS = 'MenschMachine/pdfdancer-client-*';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(LS_TOKEN_KEY));
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN_KEY) || '');
  const [repoPatterns, setRepoPatterns] = useState(() =>
    localStorage.getItem(LS_PATTERNS_KEY) || DEFAULT_PATTERNS
  );

  const [draftToken, setDraftToken] = useState(token);
  const [draftPatterns, setDraftPatterns] = useState(repoPatterns);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const patterns = repoPatterns
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    fetchDashboardData(token, patterns)
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [token, repoPatterns]);

  function handleSave() {
    localStorage.setItem(LS_TOKEN_KEY, draftToken);
    localStorage.setItem(LS_PATTERNS_KEY, draftPatterns);
    setToken(draftToken);
    setRepoPatterns(draftPatterns);
    setSettingsOpen(false);
  }

  const settingsPanel = (
    <div className="settings-panel elevated-section">
      <div className="settings-field">
        <label htmlFor="gh-token">GitHub Token</label>
        <input
          id="gh-token"
          type="password"
          value={draftToken}
          onChange={e => setDraftToken(e.target.value)}
          placeholder="ghp_..."
        />
      </div>
      <div className="settings-field">
        <label htmlFor="repo-patterns">Repository Patterns (one per line)</label>
        <textarea
          id="repo-patterns"
          value={draftPatterns}
          onChange={e => setDraftPatterns(e.target.value)}
          rows={4}
          placeholder="org/repo-*"
        />
      </div>
      <button className="settings-save" onClick={handleSave}>Save</button>
    </div>
  );

  const header = (
    <header className="dashboard-header elevated-section">
      <div className="dashboard-header-row">
        <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
        <button
          className="settings-toggle"
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-label="Settings"
        >
          &#9881;
        </button>
      </div>
    </header>
  );

  if (!token) {
    return (
      <div className="dashboard">
        <div className="dashboard-hero">
          {header}
          <div className="dashboard-status elevated-section">
            <div className="loading">Please configure your GitHub token.</div>
          </div>
        </div>
        {settingsOpen && settingsPanel}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-hero">
          {header}
          <div className="dashboard-status elevated-section">
            <div className="loading">Loading workflow data...</div>
          </div>
        </div>
        {settingsOpen && settingsPanel}
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-hero">
          {header}
          <div className="dashboard-status elevated-section">
            <div className="error">Error: {error}</div>
          </div>
        </div>
        {settingsOpen && settingsPanel}
      </div>
    );
  }

  let allGreenCount = 0;
  let allRedCount = 0;
  let mixedCount = 0;

  const repositories = data.repositories
    .filter(repo => repo.workflow_runs && repo.workflow_runs.length > 0)
    .map(repo => {
      const sortedRuns = [...repo.workflow_runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const last5 = sortedRuns.slice(0, 5);

      const allSuccess = last5.every(r => r.conclusion === 'success');
      const allFailure = last5.every(r => r.conclusion === 'failure');

      if (allSuccess) allGreenCount++;
      else if (allFailure) allRedCount++;
      else mixedCount++;

      return { repoName: repo.name, runs: sortedRuns };
    })
    .sort((a, b) => {
      const aDate = a.runs[0]?.created_at ? new Date(a.runs[0].created_at) : new Date(0);
      const bDate = b.runs[0]?.created_at ? new Date(b.runs[0].created_at) : new Date(0);
      return bDate - aDate;
    });

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        {header}
        <section className="dashboard-hero-panel elevated-section">
          <StatsBar
            totalRepos={data.repository_count}
            allGreen={allGreenCount}
            allRed={allRedCount}
            mixed={mixedCount}
          />
        </section>
      </section>

      {settingsOpen && settingsPanel}

      <section className="dashboard-section elevated-section repositories-section">
        <div className="repositories">
          {repositories.map(({ repoName, runs }) => (
            <RepositoryCard key={repoName} repoName={repoName} runs={runs} />
          ))}
        </div>
      </section>
    </div>
  );
}

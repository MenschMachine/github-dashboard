import { useState, useEffect } from 'react';
import { fetchDashboardData, clearCache } from '../github.js';
import StatsBar from './StatsBar';
import RepositoryCard from './RepositoryCard';
import './Dashboard.css';

const LS_TOKEN_KEY = 'gh-dashboard-token';
const LS_PATTERNS_KEY = 'gh-dashboard-patterns';
const LS_REPOS_TTL_KEY = 'gh-dashboard-repos-ttl';
const LS_RUNS_TTL_KEY = 'gh-dashboard-runs-ttl';
const LS_PRS_TTL_KEY = 'gh-dashboard-prs-ttl';
const DEFAULT_PATTERNS = 'MenschMachine/pdfdancer-client-*';
const DEFAULT_REPOS_TTL = 5;
const DEFAULT_RUNS_TTL = 2;
const DEFAULT_PRS_TTL = 2;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(LS_TOKEN_KEY));
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN_KEY) || '');
  const [repoPatterns, setRepoPatterns] = useState(() =>
    localStorage.getItem(LS_PATTERNS_KEY) || DEFAULT_PATTERNS
  );

  const [reposTtl, setReposTtl] = useState(() =>
    Number(localStorage.getItem(LS_REPOS_TTL_KEY)) || DEFAULT_REPOS_TTL
  );
  const [runsTtl, setRunsTtl] = useState(() =>
    Number(localStorage.getItem(LS_RUNS_TTL_KEY)) || DEFAULT_RUNS_TTL
  );
  const [prsTtl, setPrsTtl] = useState(() =>
    Number(localStorage.getItem(LS_PRS_TTL_KEY)) || DEFAULT_PRS_TTL
  );

  const [draftToken, setDraftToken] = useState(token);
  const [draftPatterns, setDraftPatterns] = useState(repoPatterns);
  const [draftReposTtl, setDraftReposTtl] = useState(reposTtl);
  const [draftRunsTtl, setDraftRunsTtl] = useState(runsTtl);
  const [draftPrsTtl, setDraftPrsTtl] = useState(prsTtl);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const patterns = repoPatterns
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    fetchDashboardData(token, patterns, {
      reposTtl: reposTtl * 60 * 1000,
      runsTtl: runsTtl * 60 * 1000,
      prsTtl: prsTtl * 60 * 1000,
    })
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          const status = err.status || err.response?.status;
          if (status === 401) {
            setError('Bad credentials — check your GitHub token.');
          } else if (status === 403) {
            setError('Access denied — your token may lack the required scopes.');
          } else if (status === 404) {
            setError('Not found — check your repository patterns and org names.');
          } else {
            setError(err.message);
          }
          setSettingsOpen(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [token, repoPatterns, reposTtl, runsTtl, prsTtl, refreshCounter]);

  function handleSave() {
    localStorage.setItem(LS_TOKEN_KEY, draftToken);
    localStorage.setItem(LS_PATTERNS_KEY, draftPatterns);
    localStorage.setItem(LS_REPOS_TTL_KEY, draftReposTtl);
    localStorage.setItem(LS_RUNS_TTL_KEY, draftRunsTtl);
    localStorage.setItem(LS_PRS_TTL_KEY, draftPrsTtl);
    setToken(draftToken);
    setRepoPatterns(draftPatterns);
    setReposTtl(draftReposTtl);
    setRunsTtl(draftRunsTtl);
    setPrsTtl(draftPrsTtl);
    setSettingsOpen(false);
  }

  function handleRefresh() {
    clearCache();
    setRefreshCounter(c => c + 1);
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
      <div className="settings-field-row">
        <div className="settings-field">
          <label htmlFor="repos-ttl">Repos Cache TTL (min)</label>
          <input
            id="repos-ttl"
            type="number"
            min="0"
            value={draftReposTtl}
            onChange={e => setDraftReposTtl(Number(e.target.value))}
          />
        </div>
        <div className="settings-field">
          <label htmlFor="runs-ttl">Runs Cache TTL (min)</label>
          <input
            id="runs-ttl"
            type="number"
            min="0"
            value={draftRunsTtl}
            onChange={e => setDraftRunsTtl(Number(e.target.value))}
          />
        </div>
        <div className="settings-field">
          <label htmlFor="prs-ttl">PRs Cache TTL (min)</label>
          <input
            id="prs-ttl"
            type="number"
            min="0"
            value={draftPrsTtl}
            onChange={e => setDraftPrsTtl(Number(e.target.value))}
          />
        </div>
      </div>
      <button className="settings-save" onClick={handleSave}>Save</button>
    </div>
  );

  const header = (
    <header className="dashboard-header elevated-section">
      <div className="dashboard-header-row">
        <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
        <div className="header-buttons">
          <button
            className="settings-toggle"
            onClick={handleRefresh}
            aria-label="Refresh"
            title="Clear cache and refresh"
          >
            &#8635;
          </button>
          <button
            className="settings-toggle"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-label="Settings"
          >
            &#9881;
          </button>
        </div>
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

  if (loading || !data) {
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

      return { repoName: repo.name, runs: sortedRuns, prs: repo.open_prs || [] };
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
            openPrs={data.total_open_prs}
          />
        </section>
      </section>

      {settingsOpen && settingsPanel}

      <section className="dashboard-section elevated-section repositories-section">
        <div className="repositories">
          {repositories.map(({ repoName, runs, prs }) => (
            <RepositoryCard key={repoName} repoName={repoName} runs={runs} prs={prs} />
          ))}
        </div>
      </section>
    </div>
  );
}

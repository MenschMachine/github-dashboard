import { useEffect, useState } from 'react';
import { clearCache, createDashboardClient } from '../github.js';
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

function getErrorMessage(err) {
  const status = err.status || err.response?.status;

  if (status === 401) {
    return 'Bad credentials — check your GitHub token.';
  }
  if (status === 403) {
    return 'Access denied — your token may lack the required scopes.';
  }
  if (status === 404) {
    return 'Not found — check your repository patterns and org names.';
  }

  return err.message;
}

function getLatestWorkflowRun(repo) {
  if (!repo.workflow_runs || repo.workflow_runs.length === 0) {
    return null;
  }

  return repo.workflow_runs.reduce((latestRun, run) => {
    const timestamp = Date.parse(run.created_at);
    const latestTimestamp = latestRun ? Date.parse(latestRun.created_at) : null;

    if (Number.isNaN(timestamp)) {
      return latestRun;
    }

    if (latestTimestamp === null || Number.isNaN(latestTimestamp) || timestamp > latestTimestamp) {
      return run;
    }

    return latestRun;
  }, null);
}

function getRepositoryStatusCounts(repositories) {
  let success = 0;
  let failed = 0;
  let other = 0;
  let openPrs = 0;

  repositories.forEach(repo => {
    if (repo.loading || repo.error) return;

    openPrs += repo.open_prs.length;

    const latestRun = getLatestWorkflowRun(repo);
    if (!latestRun) return;

    if (latestRun.conclusion === 'success') success++;
    else if (latestRun.conclusion === 'failure') failed++;
    else other++;
  });

  return { success, failed, other, openPrs };
}

function getLatestRunTimestamp(repo) {
  const latestRun = getLatestWorkflowRun(repo);
  if (!latestRun) return null;

  const timestamp = Date.parse(latestRun.created_at);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareRepositoriesByLatestRun(a, b) {
  const aLatest = getLatestRunTimestamp(a);
  const bLatest = getLatestRunTimestamp(b);

  if (aLatest !== null && bLatest !== null && aLatest !== bLatest) {
    return bLatest - aLatest;
  }

  if (aLatest !== null) return -1;
  if (bLatest !== null) return 1;

  return a.name.localeCompare(b.name);
}

export default function Dashboard() {
  const [repositories, setRepositories] = useState([]);
  const [matchedRepoCount, setMatchedRepoCount] = useState(0);
  const [discovering, setDiscovering] = useState(() => !!localStorage.getItem(LS_TOKEN_KEY));
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

    const patterns = repoPatterns
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    const client = createDashboardClient(token);
    const ttlOptions = {
      reposTtl: reposTtl * 60 * 1000,
      runsTtl: runsTtl * 60 * 1000,
      prsTtl: prsTtl * 60 * 1000,
    };

    client.fetchMatchedRepositories(patterns, ttlOptions)
      .then(matchedRepos => {
        if (cancelled) return;

        setMatchedRepoCount(matchedRepos.length);
        setRepositories(
          matchedRepos.map(repo => ({
            name: repo.full_name,
            workflow_runs: [],
            open_prs: [],
            loading: true,
            error: null,
          }))
        );
        setDiscovering(false);

        matchedRepos.forEach(repo => {
          client.fetchRepositoryData(repo, ttlOptions)
            .then(result => {
              if (cancelled) return;

              setRepositories(prev => prev.map(current =>
                current.name === repo.full_name
                  ? {
                      ...current,
                      ...result,
                      loading: false,
                      error: null,
                    }
                  : current
              ));
            })
            .catch(err => {
              if (cancelled) return;

              setRepositories(prev => prev.map(current =>
                current.name === repo.full_name
                  ? {
                      ...current,
                      workflow_runs: [],
                      open_prs: [],
                      loading: false,
                      error: getErrorMessage(err),
                    }
                  : current
              ));
            });
        });
      })
      .catch(err => {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setSettingsOpen(true);
          setDiscovering(false);
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
    setRepositories([]);
    setMatchedRepoCount(0);
    setError(null);
    setDiscovering(!!draftToken);
    setToken(draftToken);
    setRepoPatterns(draftPatterns);
    setReposTtl(draftReposTtl);
    setRunsTtl(draftRunsTtl);
    setPrsTtl(draftPrsTtl);
    setSettingsOpen(false);
  }

  function handleRefresh() {
    clearCache();
    setRepositories([]);
    setMatchedRepoCount(0);
    setError(null);
    setDiscovering(!!token);
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

  if (discovering) {
    return (
      <div className="dashboard">
        <div className="dashboard-hero">
          {header}
          <div className="dashboard-status elevated-section">
            <div className="loading">Discovering repositories...</div>
          </div>
        </div>
        {settingsOpen && settingsPanel}
      </div>
    );
  }

  const loadedRepoCount = repositories.filter(repo => !repo.loading).length;
  const hasBackgroundLoading = loadedRepoCount < matchedRepoCount;
  const { success, failed, other, openPrs } = getRepositoryStatusCounts(repositories);
  const sortedRepositories = [...repositories].sort(compareRepositoriesByLatestRun);

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        {header}
        <section className="dashboard-hero-panel elevated-section">
          <StatsBar
            totalRepos={matchedRepoCount}
            success={success}
            failed={failed}
            other={other}
            openPrs={openPrs}
          />
          <div className="dashboard-meta">
            {matchedRepoCount === 0
              ? 'No repositories matched the current patterns.'
              : hasBackgroundLoading
                ? `Loaded ${loadedRepoCount} of ${matchedRepoCount} repositories`
                : `Loaded all ${matchedRepoCount} repositories`}
          </div>
        </section>
      </section>

      {settingsOpen && settingsPanel}

      <section className="dashboard-section elevated-section repositories-section">
        {matchedRepoCount === 0 ? (
          <div className="loading">No repositories matched the configured patterns.</div>
        ) : (
          <div className="repositories">
            {sortedRepositories.map(repo => (
              <RepositoryCard
                key={repo.name}
                repoName={repo.name}
                runs={repo.workflow_runs}
                prs={repo.open_prs}
                loading={repo.loading}
                error={repo.error}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

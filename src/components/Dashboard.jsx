import { useState, useEffect } from 'react';
import StatsBar from './StatsBar';
import RepositoryCard from './RepositoryCard';
import './Dashboard.css';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('https://github-repository-status.thefamouscat.com/current-state.json');
        if (response.ok) {
          const jsonData = await response.json();
          setData(jsonData);
          setLoading(false);
        } else {
          setError('Failed to load current state data');
          setLoading(false);
        }
      } catch (err) {
        setError(`Failed to fetch data: ${err.message}`);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-hero">
          <header className="dashboard-header elevated-section">
            <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
          </header>
          <div className="dashboard-status elevated-section">
            <div className="loading">Loading workflow data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-hero">
          <header className="dashboard-header elevated-section">
            <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
          </header>
          <div className="dashboard-status elevated-section">
            <div className="error">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats - count repos by their most recent non-canceled run status
  let successCount = 0;
  let failureCount = 0;
  let inProgressCount = 0;
  let otherCount = 0;

  const repositories = data.repositories
    .filter(repo => repo.workflow_runs && repo.workflow_runs.length > 0)
    .map(repo => {
      const sortedRuns = [...repo.workflow_runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Find the most recent non-canceled run
      const mostRecentRun = sortedRuns.find(run => run.conclusion !== 'cancelled' && run.conclusion !== 'canceled');

      let status = 'other';

      // Count repos by their most recent status
      if (mostRecentRun) {
        if (mostRecentRun.conclusion === 'success') {
          successCount++;
          status = 'success';
        } else if (mostRecentRun.conclusion === 'failure') {
          failureCount++;
          status = 'failure';
        } else if (mostRecentRun.status === 'in_progress' || mostRecentRun.status === 'queued') {
          inProgressCount++;
          status = 'inProgress';
        } else {
          // Other conclusions: neutral, skipped, timed_out, action_required, etc.
          otherCount++;
        }
      } else {
        // No non-canceled runs (all runs were canceled)
        otherCount++;
      }

      const lastRunDate = sortedRuns[0]?.created_at ? new Date(sortedRuns[0].created_at) : new Date(0);

      return { repoName: repo.name, runs: sortedRuns, status, lastRunDate };
    })
    .sort((a, b) => {
      // Sort "other" status repos to the end
      if (a.status === 'other' && b.status !== 'other') return 1;
      if (a.status !== 'other' && b.status === 'other') return -1;

      // Within each group, sort by most recent run date
      return b.lastRunDate - a.lastRunDate;
    });

  const totalReposWithRuns = repositories.length;

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <header className="dashboard-header elevated-section">
          <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
        </header>

        <section className="dashboard-hero-panel elevated-section">
          <StatsBar
            totalRepos={totalReposWithRuns}
            successCount={successCount}
            failureCount={failureCount}
            inProgressCount={inProgressCount}
            otherCount={otherCount}
          />
        </section>
      </section>

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

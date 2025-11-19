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

  const repositories = data.repositories
    .filter(repo => repo.workflow_runs && repo.workflow_runs.length > 0)
    .map(repo => {
      const sortedRuns = [...repo.workflow_runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Find the most recent non-canceled run
      const mostRecentRun = sortedRuns.find(run => run.conclusion !== 'cancelled' && run.conclusion !== 'canceled');

      // Count repos by their most recent status
      if (mostRecentRun) {
        if (mostRecentRun.conclusion === 'success') {
          successCount++;
        } else if (mostRecentRun.conclusion === 'failure') {
          failureCount++;
        } else if (mostRecentRun.status === 'in_progress' || mostRecentRun.status === 'queued') {
          inProgressCount++;
        }
      }

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
        <header className="dashboard-header elevated-section">
          <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
        </header>

        <section className="dashboard-hero-panel elevated-section">
          <StatsBar
            totalRepos={data.repository_count}
            successCount={successCount}
            failureCount={failureCount}
            inProgressCount={inProgressCount}
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

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

  // Calculate stats
  let allGreenCount = 0;
  let allRedCount = 0;
  let mixedCount = 0;

  const repositories = data.repositories
    .map(repo => {
      const sortedRuns = [...repo.workflow_runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const last5 = sortedRuns.slice(0, 5);

      const allSuccess = last5.every(r => r.conclusion === 'success');
      const allFailure = last5.every(r => r.conclusion === 'failure');

      if (allSuccess) {
        allGreenCount++;
      } else if (allFailure) {
        allRedCount++;
      } else {
        mixedCount++;
      }

      return { repoName: repo.name, runs: sortedRuns };
    })
    .sort((a, b) => new Date(b.runs[0].created_at) - new Date(a.runs[0].created_at));

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <header className="dashboard-header elevated-section">
          <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
        </header>

        <section className="dashboard-hero-panel elevated-section">
          <StatsBar
            totalRepos={data.repository_count}
            allGreen={allGreenCount}
            allRed={allRedCount}
            mixed={mixedCount}
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

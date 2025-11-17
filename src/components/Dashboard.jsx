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
      const currentYear = new Date().getFullYear();
      const years = [currentYear, currentYear - 1]; // Try current year, then previous year

      for (const year of years) {
        try {
          const response = await fetch(`https://github-repository-status.thefamouscat.com/agg-yearly-${year}.json`);
          if (response.ok) {
            const jsonData = await response.json();
            setData(jsonData);
            setLoading(false);
            return;
          }
        } catch {
          // Continue to next year
        }
      }

      // If we get here, no data file was found
      setError('No data file found for current or previous year');
      setLoading(false);
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

  // Group runs by repository
  const repoMap = new Map();
  data.workflow_runs.forEach(run => {
    if (!repoMap.has(run.repository)) {
      repoMap.set(run.repository, []);
    }
    repoMap.get(run.repository).push(run);
  });

  // Calculate stats
  let allGreenCount = 0;
  let allRedCount = 0;
  let mixedCount = 0;

  const repositories = Array.from(repoMap.entries()).map(([repoName, runs]) => {
    const sortedRuns = [...runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

    return { repoName, runs };
  });

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <header className="dashboard-header elevated-section">
          <h1 className="dashboard-title">GitHub Actions Dashboard</h1>
        </header>

        <section className="dashboard-hero-panel elevated-section">
          <StatsBar
            totalRepos={repoMap.size}
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

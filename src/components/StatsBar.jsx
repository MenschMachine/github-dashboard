import './StatsBar.css';

export default function StatsBar({ totalRepos, success, failed, other, openPrs }) {
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-value">{totalRepos}</div>
        <div className="stat-label">Total Repositories</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{openPrs}</div>
        <div className="stat-label">Open PRs</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-green">{success}</div>
        <div className="stat-label">Latest Success</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-red">{failed}</div>
        <div className="stat-label">Latest Failed</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-yellow">{other}</div>
        <div className="stat-label">Latest Other</div>
      </div>
    </div>
  );
}

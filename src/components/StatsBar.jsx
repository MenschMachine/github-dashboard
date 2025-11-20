import './StatsBar.css';

export default function StatsBar({ totalRepos, successCount, failureCount, inProgressCount, otherCount }) {
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-value">{totalRepos}</div>
        <div className="stat-label">Total Repositories</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-green">{successCount}</div>
        <div className="stat-label">Green</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-red">{failureCount}</div>
        <div className="stat-label">Red</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-yellow">{inProgressCount}</div>
        <div className="stat-label">In Progress / Queued</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-gray">{otherCount}</div>
        <div className="stat-label">Other</div>
      </div>
    </div>
  );
}

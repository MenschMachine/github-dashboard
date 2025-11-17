import './StatsBar.css';

export default function StatsBar({ totalRepos, allGreen, allRed, mixed }) {
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-value">{totalRepos}</div>
        <div className="stat-label">Total Repositories</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-green">{allGreen}</div>
        <div className="stat-label">All Green</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-red">{allRed}</div>
        <div className="stat-label">All Red</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-yellow">{mixed}</div>
        <div className="stat-label">Mixed Status</div>
      </div>
    </div>
  );
}

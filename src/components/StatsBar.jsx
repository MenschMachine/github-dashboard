import './StatsBar.css';

export default function StatsBar({ failed, other }) {
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-value stat-red">{failed}</div>
        <div className="stat-label">Failed</div>
      </div>
      <div className="stat-card">
        <div className="stat-value stat-yellow">{other}</div>
        <div className="stat-label">Other</div>
      </div>
    </div>
  );
}

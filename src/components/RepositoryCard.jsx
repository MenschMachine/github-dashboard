import BuildBadge from './BuildBadge';
import { formatDate } from '../utils/dateFormatter';
import './RepositoryCard.css';

export default function RepositoryCard({ repoName, runs }) {
  // Sort by created_at descending (most recent first)
  const sortedRuns = [...runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Get last 5 builds
  const last5 = sortedRuns.slice(0, 5);

  // Get all previous builds (for finding last failure/success)
  const previousBuilds = sortedRuns.slice(5);

  // Check if all are success or all are failure
  const allSuccess = last5.every(r => r.conclusion === 'success');
  const allFailure = last5.every(r => r.conclusion === 'failure');

  let statusClass = 'mixed';
  let statusText = 'Mixed Status';
  let additionalInfo = null;

  if (allSuccess) {
    statusClass = 'all-green';
    statusText = 'All Green';

    // Find last failure
    const lastFailure = previousBuilds.find(r => r.conclusion === 'failure');
    if (lastFailure) {
      const failureDate = formatDate(lastFailure.created_at);
      additionalInfo = (
        <div className="additional-info">
          <p>
            <strong>Last failure:</strong>{' '}
            <span className="date-highlight">{failureDate}</span> ({lastFailure.name})
          </p>
        </div>
      );
    } else {
      additionalInfo = (
        <div className="additional-info">
          <p><strong>No previous failures found</strong> in recorded history</p>
        </div>
      );
    }
  } else if (allFailure) {
    statusClass = 'all-red';
    statusText = 'All Red';

    // Find last success
    const lastSuccess = previousBuilds.find(r => r.conclusion === 'success');
    if (lastSuccess) {
      const successDate = formatDate(lastSuccess.created_at);
      additionalInfo = (
        <div className="additional-info">
          <p>
            <strong>Last success:</strong>{' '}
            <span className="date-highlight">{successDate}</span> ({lastSuccess.name})
          </p>
        </div>
      );
    } else {
      additionalInfo = (
        <div className="additional-info">
          <p><strong>No previous successes found</strong> in recorded history</p>
        </div>
      );
    }
  } else {
    const successCount = last5.filter(r => r.conclusion === 'success').length;
    const failureCount = last5.filter(r => r.conclusion === 'failure').length;
    statusText = `${successCount} Success, ${failureCount} Failure`;
  }

  const repoUrl = `https://github.com/${repoName}`;

  return (
    <div className="repo-card">
      <div className="repo-header">
        <div className="repo-name">
          <span className="icon">📦</span>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer">
            {repoName}
          </a>
        </div>
        <div className={`status-info ${statusClass}`}>{statusText}</div>
      </div>
      <div className="builds-container">
        {last5.map((run) => (
          <BuildBadge key={run.run_id} run={run} />
        ))}
      </div>
      {additionalInfo}
    </div>
  );
}

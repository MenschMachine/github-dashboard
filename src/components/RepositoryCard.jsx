import { useState } from 'react';
import BuildBadge from './BuildBadge';
import { formatDate } from '../utils/dateFormatter';
import './RepositoryCard.css';

export default function RepositoryCard({ repoName, runs = [], prs = [], loading = false, error = null }) {
  // Sort by created_at descending (most recent first)
  const sortedRuns = [...runs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Get last 5 builds
  const last5 = sortedRuns.slice(0, 5);

  // Get all previous builds (for finding last failure/success)
  const previousBuilds = sortedRuns.slice(5);

  // Check if all are success or all are failure
  const allSuccess = last5.length > 0 && last5.every(r => r.conclusion === 'success');
  const allFailure = last5.length > 0 && last5.every(r => r.conclusion === 'failure');

  let additionalInfo = null;

  if (allSuccess) {
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
  }

  const repoUrl = `https://github.com/${repoName}`;

  return (
    <div className={`repo-card${loading ? ' repo-card-loading' : ''}${error ? ' repo-card-error' : ''}`}>
      <div className="repo-header">
        <div className="repo-name">
          <span className="icon">📦</span>
          <a href={repoUrl} target="_blank" rel="noopener noreferrer">
            {repoName}
          </a>
        </div>
        {(loading || error) && (
          <div className={`status-info ${loading ? 'status-loading' : 'status-error'}`}>
            {loading ? 'Loading' : 'Unavailable'}
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="repo-message repo-message-error">{error}</div>
      ) : (
        <>
          {last5.length > 0 ? (
            <>
              <div className="builds-container">
                {last5.map((run) => (
                  <BuildBadge key={run.run_id} run={run} />
                ))}
              </div>
              {additionalInfo}
            </>
          ) : (
            <div className="repo-message">No recent workflow runs found.</div>
          )}
          {prs.length > 0 && (
            <PrsSection prs={prs} />
          )}
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="repo-loading-state" aria-hidden="true">
      <div className="builds-container">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="build-badge build-badge-skeleton" />
        ))}
      </div>
      <div className="repo-message repo-message-skeleton skeleton-block" />
      <div className="repo-message repo-message-skeleton skeleton-block skeleton-block-short" />
    </div>
  );
}

function PrsSection({ prs }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="prs-container">
      <button className="prs-toggle" onClick={() => setOpen(o => !o)}>
        <span className={`prs-arrow ${open ? 'prs-arrow-open' : ''}`}>&#9656;</span>
        Open PRs ({prs.length})
      </button>
      {open && prs.map(pr => (
        <div key={pr.number} className="pr-item">
          <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="pr-title">
            #{pr.number} {pr.title}
          </a>
          <div className="pr-meta">
            <span className="pr-author">{pr.user}</span>
            {pr.draft && <span className="pr-draft">Draft</span>}
            <span className="pr-updated">{formatDate(pr.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

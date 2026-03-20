import { useEffect, useMemo, useState } from 'react';
import { createDashboardClient } from '../github.js';
import { formatDate } from '../utils/dateFormatter';
import './AllPrsSection.css';

function labelTextColor(hexColor) {
  if (!hexColor) return '#fff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}

function ReviewBadge({ status }) {
  if (!status) {
    return <span className="all-pr-review-badge all-pr-review-pending">...</span>;
  }
  if (status === 'APPROVED') {
    return <span className="all-pr-review-badge all-pr-review-approved">Approved</span>;
  }
  if (status === 'CHANGES_REQUESTED') {
    return <span className="all-pr-review-badge all-pr-review-changes">Changes requested</span>;
  }
  return <span className="all-pr-review-badge all-pr-review-pending">Pending</span>;
}

export default function AllPrsSection({ repositories, token, prsTtl }) {
  const [open, setOpen] = useState(false);
  const [reviewStatuses, setReviewStatuses] = useState({});

  const allPrs = useMemo(() => {
    const prs = [];
    for (const repo of repositories) {
      if (!repo.open_prs) continue;
      const shortName = repo.name.split('/').pop();
      for (const pr of repo.open_prs) {
        prs.push({ ...pr, repoFullName: repo.name, repoName: shortName });
      }
    }
    prs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return prs;
  }, [repositories]);

  const groupedByLabel = useMemo(() => {
    const groups = {};
    for (const pr of allPrs) {
      if (pr.labels.length === 0) {
        (groups['_unlabeled'] ??= { label: null, prs: [] }).prs.push(pr);
      } else {
        for (const label of pr.labels) {
          (groups[label.name] ??= { label, prs: [] }).prs.push(pr);
        }
      }
    }
    // Sort groups: labeled first (alphabetical), unlabeled last
    const entries = Object.entries(groups);
    entries.sort(([a], [b]) => {
      if (a === '_unlabeled') return 1;
      if (b === '_unlabeled') return -1;
      return a.localeCompare(b);
    });
    return entries.map(([, v]) => v);
  }, [allPrs]);

  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (name) => setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    if (!open || !token || allPrs.length === 0) return;

    const client = createDashboardClient(token);
    const ttlOpts = { prsTtl: (prsTtl || 2) * 60 * 1000 };

    for (const pr of allPrs) {
      const key = `${pr.repoFullName}#${pr.number}`;
      if (reviewStatuses[key]) continue;

      const [owner, repo] = pr.repoFullName.split('/');
      client.fetchPrReviews(owner, repo, pr.number, ttlOpts).then(status => {
        setReviewStatuses(prev => ({ ...prev, [key]: status }));
      }).catch(() => {
        setReviewStatuses(prev => ({ ...prev, [key]: 'PENDING' }));
      });
    }
  }, [open, token, allPrs, prsTtl]);

  if (allPrs.length === 0) return null;

  return (
    <section className="dashboard-section elevated-section all-prs-section">
      <button className="all-prs-toggle" onClick={() => setOpen(o => !o)}>
        <span className={`all-prs-arrow ${open ? 'all-prs-arrow-open' : ''}`}>&#9656;</span>
        All Open PRs ({allPrs.length})
      </button>
      {open && (
        <div className="all-prs-list">
          {groupedByLabel.map(group => {
            const groupKey = group.label ? group.label.name : '_unlabeled';
            const isGroupOpen = openGroups[groupKey] !== false; // default open
            return (
              <div key={groupKey} className="all-prs-label-group">
                <button className="all-prs-group-toggle" onClick={() => toggleGroup(groupKey)}>
                  <span className={`all-prs-arrow ${isGroupOpen ? 'all-prs-arrow-open' : ''}`}>&#9656;</span>
                  {group.label ? (
                    <span
                      className="all-pr-label all-prs-group-label"
                      style={{
                        backgroundColor: `#${group.label.color}`,
                        color: labelTextColor(group.label.color),
                      }}
                    >
                      {group.label.name}
                    </span>
                  ) : (
                    <span className="all-prs-group-name">Unlabeled</span>
                  )}
                  <span className="all-prs-group-count">({group.prs.length})</span>
                </button>
                {isGroupOpen && group.prs.map(pr => {
                  const reviewKey = `${pr.repoFullName}#${pr.number}`;
                  return (
                    <div key={reviewKey} className="all-pr-item">
                      <div className="all-pr-top-row">
                        <span className="all-pr-repo">{pr.repoName}</span>
                        <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="all-pr-title">
                          #{pr.number} {pr.title}
                        </a>
                      </div>
                      <div className="all-pr-meta">
                        <span>{pr.user}</span>
                        {pr.draft && <span className="pr-draft">Draft</span>}
                        <ReviewBadge status={reviewStatuses[reviewKey]} />
                        <span>{formatDate(pr.updated_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

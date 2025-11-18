import { formatDate } from '../utils/dateFormatter';
import './BuildBadge.css';

export default function BuildBadge({ run }) {
  const conclusion = run.conclusion || run.status || 'unknown';

  const statusClass = conclusion === 'success' ? 'success' :
                      conclusion === 'failure' ? 'failure' :
                      conclusion === 'in_progress' ? 'in-progress' : 'cancelled';

  const statusText = conclusion.charAt(0).toUpperCase() + conclusion.slice(1).replace('_', ' ');
  const date = formatDate(run.created_at);

  // Use the html_url from the data
  const repoUrl = run.html_url;

  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`build-badge ${statusClass}`}
    >
      <div className="workflow-name">{run.name}</div>
      <div className="status">{statusText}</div>
      <div className="date">{date}</div>
    </a>
  );
}

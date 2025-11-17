import { formatDate } from '../utils/dateFormatter';
import './BuildBadge.css';

export default function BuildBadge({ run }) {
  const statusClass = run.conclusion === 'success' ? 'success' :
                      run.conclusion === 'failure' ? 'failure' : 'cancelled';
  const statusText = run.conclusion.charAt(0).toUpperCase() + run.conclusion.slice(1);
  const date = formatDate(run.created_at);

  // Build GitHub URL from repository name and run_id
  const repoUrl = `https://github.com/${run.repository}/actions/runs/${run.run_id}`;

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

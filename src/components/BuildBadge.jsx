import { formatDate } from '../utils/dateFormatter';
import './BuildBadge.css';

export default function BuildBadge({ run }) {
  const statusClass = run.conclusion === 'success' ? 'success' :
                      run.conclusion === 'failure' ? 'failure' : 'cancelled';
  const statusText = run.conclusion.charAt(0).toUpperCase() + run.conclusion.slice(1);
  const date = formatDate(run.created_at);

  return (
    <div className={`build-badge ${statusClass}`}>
      <div className="workflow-name">{run.name}</div>
      <div className="status">{statusText}</div>
      <div className="date">{date}</div>
    </div>
  );
}

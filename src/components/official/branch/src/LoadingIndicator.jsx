import './Official.css';

export default function LoadingIndicator({ message, compact = false, className = '' }) {
  return (
    <span
      className={`loading-state ${compact ? 'compact' : ''} ${className}`.trim()}
      role={compact ? undefined : 'status'}
      aria-live={compact ? undefined : 'polite'}
    >
      <span className="loading-spinner" aria-hidden="true" />
      <span>{message}</span>
    </span>
  );
}

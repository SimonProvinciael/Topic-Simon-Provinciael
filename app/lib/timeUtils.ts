export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'net actief';
  } else if (diffMins < 60) {
    return `${diffMins}m geleden`;
  } else if (diffHours < 24) {
    return `${diffHours}h geleden`;
  } else if (diffDays < 7) {
    return `${diffDays}d geleden`;
  } else {
    return 'lang geleden';
  }
};

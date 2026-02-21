import React from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  onClick: () => void;
  lastRefresh: Date;
}

export function RefreshButton({ onClick, lastRefresh }: Props) {
  const [isSpinning, setIsSpinning] = React.useState(false);

  const handleClick = async () => {
    setIsSpinning(true);
    await onClick();
    setTimeout(() => setIsSpinning(false), 500);
  };

  const timeAgo = () => {
    const seconds = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      title="Refresh data"
    >
      <RefreshCw className={`w-4 h-4 text-gray-600 ${isSpinning ? 'animate-spin' : ''}`} />
      <span className="text-sm text-gray-700">
        {timeAgo()}
      </span>
    </button>
  );
}

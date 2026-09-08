import React from 'react';
import { Clock, Download, Trash2, X, FileText } from 'lucide-react';
import { useRecentStore, type RecentItem } from '../../store/recentStore';
import { formatBytes } from '../../utils/fileUtils';
import { apiService } from '../../services/api';

interface Props {
  compact?: boolean;
}

export const RecentConversions: React.FC<Props> = ({ compact = false }) => {
  const { recentItems, removeRecentItem, clearRecentItems } = useRecentStore();

  if (recentItems.length === 0) {
    return null;
  }

  const getTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleDownload = (item: RecentItem) => {
    const url = apiService.getFileDownloadUrl(item.jobId, item.fileId);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.outputName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`recent-conversions-card ${compact ? 'recent-compact' : ''}`}>
      <div className="recent-header">
        <div className="recent-title-group">
          <div className="recent-icon-badge">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="recent-title">Recent Activity</h3>
            <span className="recent-subtitle">
              {recentItems.length} file{recentItems.length > 1 ? 's' : ''} ready to download
            </span>
          </div>
        </div>

        <button
          onClick={clearRecentItems}
          className="recent-clear-btn"
          title="Clear recent conversions"
        >
          <Trash2 size={14} />
          <span>Clear</span>
        </button>
      </div>

      <div className="recent-list">
        {recentItems.map((item) => (
          <div key={item.id} className="recent-item">
            <div className="recent-item-info">
              <div className="recent-file-icon">
                <FileText size={18} />
              </div>
              <div className="recent-file-meta">
                <span className="recent-file-name" title={item.outputName}>
                  {item.outputName}
                </span>
                <div className="recent-file-submeta">
                  <span className="recent-format-tag">{item.outputFormat.toUpperCase()}</span>
                  <span className="recent-bullet">•</span>
                  <span>{formatBytes(item.outputSizeBytes || item.sizeBytes)}</span>
                  <span className="recent-bullet">•</span>
                  <span className="recent-time">{getTimeAgo(item.timestamp)}</span>
                </div>
              </div>
            </div>

            <div className="recent-actions">
              <button
                onClick={() => handleDownload(item)}
                className="recent-download-btn"
                title={`Download ${item.outputName}`}
              >
                <Download size={14} />
                <span>Download</span>
              </button>
              <button
                onClick={() => removeRecentItem(item.id)}
                className="recent-remove-btn"
                title="Remove from history"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

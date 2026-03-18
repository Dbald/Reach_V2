import React from 'react';
import type { ValidationSeverity, AssetStatus, PublishStatus } from '@/types';

const severityColors: Record<ValidationSeverity, string> = {
  blocker: '#dc3545',
  warning: '#ffc107',
  suggestion: '#17a2b8',
};

const statusColors: Record<AssetStatus | PublishStatus, string> = {
  uploading: '#6c757d',
  processing: '#ffc107',
  ready: '#28a745',
  error: '#dc3545',
  draft: '#6c757d',
  preflight: '#ffc107',
  publishing: '#17a2b8',
  published: '#28a745',
  failed: '#dc3545',
};

interface Props {
  label: string;
  type: 'severity' | 'status';
  value: ValidationSeverity | AssetStatus | PublishStatus;
}

export const StatusBadge: React.FC<Props> = ({ label, type, value }) => {
  const colors = type === 'severity' ? severityColors : statusColors;
  const bg = (colors as Record<string, string>)[value] ?? '#6c757d';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        color: '#fff',
        backgroundColor: bg,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
};

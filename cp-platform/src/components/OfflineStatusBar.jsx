import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus.js';
import { WifiOff, ShieldCheck, RefreshCw } from 'lucide-react';

export function OfflineStatusBar() {
  const { isOnline, isOfflineCapable, syncPending } = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div 
      className="offline-banner"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: 'rgba(239, 68, 68, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-lg, 8px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        color: 'var(--text, #f3f4f6)',
      }}
    >
      <WifiOff size={16} className="text-destructive animate-pulse" style={{ color: '#ef4444' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
          Working Offline
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary, #9ca3af)' }}>
          {isOfflineCapable 
            ? 'Dual-cached to local database (Offline Lite)' 
            : 'Changes saved in memory only'}
        </span>
      </div>
      {syncPending && (
        <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--primary)' }} />
      )}
      {isOfflineCapable && (
        <ShieldCheck size={14} style={{ color: '#10b981', marginLeft: '4px' }} title="IndexedDB Active" />
      )}

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

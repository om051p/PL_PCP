/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineStatusBar } from '../OfflineStatusBar.jsx';
import { useOfflineStatus } from '../../hooks/useOfflineStatus.js';
import React from 'react';

vi.mock('../../hooks/useOfflineStatus.js', () => ({
  useOfflineStatus: vi.fn(),
}));

describe('OfflineStatusBar', () => {
  it('should render nothing when online', () => {
    vi.mocked(useOfflineStatus).mockReturnValue({
      isOnline: true,
      isOfflineCapable: true,
      syncPending: false,
    });
    const { container } = render(<OfflineStatusBar />);
    expect(container.firstChild).toBeNull();
  });

  it('should render banner when offline', () => {
    vi.mocked(useOfflineStatus).mockReturnValue({
      isOnline: false,
      isOfflineCapable: true,
      syncPending: false,
    });
    render(<OfflineStatusBar />);
    expect(screen.getByText('Working Offline')).toBeDefined();
    expect(screen.getByText('Dual-cached to local database (Offline Lite)')).toBeDefined();
  });
});

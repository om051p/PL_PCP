/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useOfflineStatus } from '../useOfflineStatus.js';
import React from 'react';

function TestComponent() {
  const { isOnline, isOfflineCapable } = useOfflineStatus();
  return (
    <div>
      <span data-testid="online">{isOnline ? 'online' : 'offline'}</span>
      <span data-testid="capable">{isOfflineCapable ? 'capable' : 'incapable'}</span>
    </div>
  );
}

describe('useOfflineStatus hook', () => {
  it('should initialize status from navigator.onLine', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('online').textContent).toBe('online');
  });

  it('should update status when online/offline events fire', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('online').textContent).toBe('online');

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('online').textContent).toBe('offline');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByTestId('online').textContent).toBe('online');
  });
});

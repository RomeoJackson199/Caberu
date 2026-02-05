/**
 * Tests for useOfflineStatus hook - Track online/offline status
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineStatus } from '../useOfflineStatus';

// Mock offlineManager
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockGetStatus = jest.fn();
const mockGetQueueSize = jest.fn();
const mockQueueOperation = jest.fn();

jest.mock('@/lib/offlineManager', () => ({
  offlineManager: {
    subscribe: (callback: (status: string) => void) => {
      mockSubscribe(callback);
      return mockUnsubscribe;
    },
    getStatus: () => mockGetStatus(),
    getQueueSize: () => mockGetQueueSize(),
    queueOperation: (...args: unknown[]) => mockQueueOperation(...args),
  },
  ConnectionStatus: {
    online: 'online',
    offline: 'offline',
    slow: 'slow',
  },
}));

describe('useOfflineStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetStatus.mockReturnValue('online');
    mockGetQueueSize.mockReturnValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with current status from offlineManager', () => {
    mockGetStatus.mockReturnValue('online');
    mockGetQueueSize.mockReturnValue(5);

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.status).toBe('online');
    expect(result.current.queueSize).toBe(5);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.isSlow).toBe(false);
  });

  it('should return offline status correctly', () => {
    mockGetStatus.mockReturnValue('offline');

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.status).toBe('offline');
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.isSlow).toBe(false);
  });

  it('should return slow status correctly', () => {
    mockGetStatus.mockReturnValue('slow');

    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.status).toBe('slow');
    expect(result.current.isOnline).toBe(true); // slow is still considered online
    expect(result.current.isOffline).toBe(false);
    expect(result.current.isSlow).toBe(true);
  });

  it('should subscribe to status changes on mount', () => {
    renderHook(() => useOfflineStatus());

    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should unsubscribe and clear interval on unmount', () => {
    const { unmount } = renderHook(() => useOfflineStatus());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update status when subscription callback is called', () => {
    mockGetStatus.mockReturnValue('online');
    const { result } = renderHook(() => useOfflineStatus());

    // Get the callback that was passed to subscribe
    const subscribeCallback = mockSubscribe.mock.calls[0][0];

    // Simulate status change
    mockGetStatus.mockReturnValue('offline');
    mockGetQueueSize.mockReturnValue(3);

    act(() => {
      subscribeCallback('offline');
    });

    expect(result.current.status).toBe('offline');
    expect(result.current.queueSize).toBe(3);
  });

  it('should update queue size periodically', async () => {
    mockGetQueueSize.mockReturnValue(0);
    const { result } = renderHook(() => useOfflineStatus());

    expect(result.current.queueSize).toBe(0);

    // Update mock return value
    mockGetQueueSize.mockReturnValue(5);

    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.queueSize).toBe(5);
  });

  it('should provide queueOperation function', () => {
    const { result } = renderHook(() => useOfflineStatus());

    expect(typeof result.current.queueOperation).toBe('function');

    // Call the queueOperation
    result.current.queueOperation({ type: 'test', data: {} } as any, 'test-table' as any);

    expect(mockQueueOperation).toHaveBeenCalledWith({ type: 'test', data: {} }, 'test-table');
  });
});

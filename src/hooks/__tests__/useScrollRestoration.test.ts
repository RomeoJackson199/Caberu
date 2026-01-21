import { renderHook } from '@testing-library/react';
import { useScrollRestoration } from '../useScrollRestoration';
import { useLocation } from 'react-router-dom';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

describe('useScrollRestoration', () => {
  const mockLocation = {
    pathname: '/test',
    hash: '',
    search: '',
    state: null,
    key: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (useLocation as jest.Mock).mockReturnValue(mockLocation);
    window.scrollY = 0;

    // Reset scroll mock
    (window.scrollTo as jest.Mock).mockClear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should restore scroll position when navigating back to a page', () => {
    // Set up initial scroll position in sessionStorage
    const positions = { '/test': 500 };
    sessionStorage.setItem('scroll:positions', JSON.stringify(positions));

    renderHook(() => useScrollRestoration());

    // Wait for requestAnimationFrame to be called
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: 'auto',
    });
  });

  it('should save scroll position on scroll event', () => {
    const { unmount } = renderHook(() => useScrollRestoration());

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 300, writable: true });
    window.dispatchEvent(new Event('scroll'));

    // Check sessionStorage
    const saved = JSON.parse(sessionStorage.getItem('scroll:positions') || '{}');
    expect(saved['/test']).toBe(300);

    unmount();
  });

  it('should handle hash in location', () => {
    const locationWithHash = { ...mockLocation, hash: '#section' };
    (useLocation as jest.Mock).mockReturnValue(locationWithHash);

    const positions = { '/test#section': 700 };
    sessionStorage.setItem('scroll:positions', JSON.stringify(positions));

    renderHook(() => useScrollRestoration());

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 700,
      behavior: 'auto',
    });
  });

  it('should not scroll if no saved position exists', () => {
    renderHook(() => useScrollRestoration());

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('should handle invalid JSON in sessionStorage gracefully', () => {
    sessionStorage.setItem('scroll:positions', 'invalid json{');

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    renderHook(() => useScrollRestoration());

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to parse scroll positions from sessionStorage:',
      expect.any(Error)
    );
    expect(window.scrollTo).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should handle sessionStorage save errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock sessionStorage.setItem to throw
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    renderHook(() => useScrollRestoration());

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save scroll position to sessionStorage:',
      expect.any(Error)
    );

    // Restore
    sessionStorage.setItem = originalSetItem;
    consoleErrorSpy.mockRestore();
  });

  it('should remove scroll listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useScrollRestoration());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('should update when location changes', () => {
    const { rerender } = renderHook(() => useScrollRestoration());

    // Change location
    const newLocation = { ...mockLocation, pathname: '/new-page' };
    (useLocation as jest.Mock).mockReturnValue(newLocation);

    // Set scroll position for new page
    const positions = { '/new-page': 1000 };
    sessionStorage.setItem('scroll:positions', JSON.stringify(positions));

    rerender();

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 1000,
      behavior: 'auto',
    });
  });

  it('should handle position value of 0', () => {
    const positions = { '/test': 0 };
    sessionStorage.setItem('scroll:positions', JSON.stringify(positions));

    renderHook(() => useScrollRestoration());

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'auto',
    });
  });

  it('should use passive listener for scroll events', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useScrollRestoration());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true }
    );

    addEventListenerSpy.mockRestore();
  });
});

/**
 * useStableCardLayout Hook
 * Prevents card flashing and jitter by:
 * 1. Keeping cards mounted at all times (opacity swap instead of mount/unmount)
 * 2. Freezing card order during loading
 * 3. Disabling transitions on first render
 */

import { useState, useEffect, useRef, useMemo } from 'react';

export interface CardData {
  id: string;
  priority: number; // Lower = higher priority (1 = most important)
  visible: boolean;
  loading?: boolean;
}

interface UseStableCardLayoutOptions {
  cards: CardData[];
  /** Minimum time (ms) to show loading state before transitioning */
  minLoadingTime?: number;
  /** Whether to reorder cards based on priority changes */
  enableReordering?: boolean;
}

interface UseStableCardLayoutReturn {
  /** Stable ordered card IDs that won't jitter during loading */
  orderedCardIds: string[];
  /** Whether initial load is complete (use to enable animations) */
  isInitialLoadComplete: boolean;
  /** Map of card ID to its visibility state */
  cardVisibility: Record<string, boolean>;
  /** CSS classes to apply to container for stable layout */
  containerClassName: string;
}

export function useStableCardLayout({
  cards,
  minLoadingTime = 300,
  enableReordering = true,
}: UseStableCardLayoutOptions): UseStableCardLayoutReturn {
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [stableOrder, setStableOrder] = useState<string[]>([]);
  const loadStartTime = useRef<number>(Date.now());
  const hasReceivedData = useRef(false);

  // Track if we've received real data (not just loading states)
  const allCardsLoaded = useMemo(() => {
    return cards.every(card => !card.loading);
  }, [cards]);

  // Initialize stable order on first render
  useEffect(() => {
    if (stableOrder.length === 0 && cards.length > 0) {
      const initialOrder = [...cards]
        .sort((a, b) => a.priority - b.priority)
        .map(c => c.id);
      setStableOrder(initialOrder);
    }
  }, [cards, stableOrder.length]);

  // Handle transition from loading to loaded
  useEffect(() => {
    if (allCardsLoaded && !hasReceivedData.current) {
      hasReceivedData.current = true;
      
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      
      // Ensure minimum loading time to prevent flash
      setTimeout(() => {
        setIsInitialLoadComplete(true);
        
        // Update order after initial load if reordering is enabled
        if (enableReordering) {
          const newOrder = [...cards]
            .sort((a, b) => a.priority - b.priority)
            .filter(c => c.visible)
            .map(c => c.id);
          setStableOrder(newOrder);
        }
      }, remaining);
    }
  }, [allCardsLoaded, minLoadingTime, enableReordering, cards]);

  // Only update order after initial load and on significant priority changes
  useEffect(() => {
    if (!isInitialLoadComplete || !enableReordering) return;

    // Debounce reordering to prevent jitter
    const timer = setTimeout(() => {
      const newOrder = [...cards]
        .sort((a, b) => a.priority - b.priority)
        .filter(c => c.visible)
        .map(c => c.id);
      
      // Only update if order actually changed
      const orderChanged = newOrder.some((id, idx) => stableOrder[idx] !== id);
      if (orderChanged) {
        setStableOrder(newOrder);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cards, isInitialLoadComplete, enableReordering, stableOrder]);

  // Build visibility map
  const cardVisibility = useMemo(() => {
    return cards.reduce((acc, card) => {
      acc[card.id] = card.visible;
      return acc;
    }, {} as Record<string, boolean>);
  }, [cards]);

  // Container classes for stable layout
  const containerClassName = useMemo(() => {
    if (!isInitialLoadComplete) {
      // During initial load: disable all transitions
      return '[&_*]:!transition-none';
    }
    return '';
  }, [isInitialLoadComplete]);

  return {
    orderedCardIds: stableOrder.length > 0 ? stableOrder : cards.map(c => c.id),
    isInitialLoadComplete,
    cardVisibility,
    containerClassName,
  };
}

/**
 * Helper to calculate card priority based on importance rules
 */
export function calculateCardPriority(config: {
  hasUnpaidPayments?: boolean;
  unpaidAmount?: number;
  hasUpcomingAppointmentSoon?: boolean; // within 24-48 hours
  prescriptionCount?: number;
  isEmpty?: boolean;
}): number {
  const {
    hasUnpaidPayments,
    unpaidAmount = 0,
    hasUpcomingAppointmentSoon,
    prescriptionCount = 0,
    isEmpty = false,
  } = config;

  // Base priority (lower = higher importance)
  let priority = 50;

  // Unpaid payments = highest priority
  if (hasUnpaidPayments && unpaidAmount > 0) {
    priority = 1;
  }
  // Upcoming appointment soon = high priority
  else if (hasUpcomingAppointmentSoon) {
    priority = 10;
  }
  // Has prescriptions = medium priority
  else if (prescriptionCount > 0) {
    priority = 20;
  }
  // Empty card = low priority (demote)
  else if (isEmpty) {
    priority = 100;
  }

  return priority;
}

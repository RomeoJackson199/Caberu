import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: 'booked' | 'vacation' | 'outside_hours';
  appointmentId?: string;
}

/**
 * Gets the current business ID from session or returns null
 */
async function getCurrentBusinessId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('session_business')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return data?.business_id || null;
  } catch {
    return null;
  }
}

// Optimized cache for availability with automatic cleanup
interface CacheEntry {
  data: TimeSlot[];
  timestamp: number;
}
const availabilityCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - extended for better performance
const MAX_CACHE_SIZE = 100; // Prevent unbounded cache growth
let cacheCleanupIntervalId: ReturnType<typeof setInterval> | null = null;

// Automatic cache cleanup to prevent memory leaks
function ensureCacheCleanupInterval() {
  if (cacheCleanupIntervalId) return;

  cacheCleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of availabilityCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        availabilityCache.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Clean every 5 minutes
}

/**
 * Stop background cache cleanup interval (useful for tests/HMR teardown)
 */
export function disposeAvailabilityCacheCleanup() {
  if (!cacheCleanupIntervalId) return;

  clearInterval(cacheCleanupIntervalId);
  cacheCleanupIntervalId = null;
}

/**
 * Fetches available time slots for a dentist on a specific date
 * Uses the database function for reliable computation
 */
export async function fetchDentistAvailability(
  dentistId: string,
  date: Date,
  skipCache: boolean = false
): Promise<TimeSlot[]> {
  ensureCacheCleanupInterval();

  const dateStr = format(date, 'yyyy-MM-dd');
  const cacheKey = `${dentistId}_${dateStr}`;

  // Check cache first
  if (!skipCache) {
    const cached = availabilityCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const businessId = await getCurrentBusinessId();

    // Call the dynamic availability function (working hours - vacations - booked)
    const { data, error } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: Array<{ slot_start: string; slot_end: string }> | null; error: unknown }> }).rpc('get_available_slots', {
      p_dentist_id: dentistId,
      p_date: dateStr,
      p_business_id: businessId,
      p_service_id: null
    });

    if (error) {
      console.error('Error fetching availability:', error);
      return [];
    }

    // Map database result to TimeSlot format
    // get_available_slots returns only available slots (slot_start, slot_end)
    const slots: TimeSlot[] = (data || []).map((slot: { slot_start: string; slot_end: string }) => {
      // Extract time from slot_start (format: "HH:MM:SS" or full timestamp)
      const timeStr = typeof slot.slot_start === 'string' && slot.slot_start.includes('T')
        ? slot.slot_start.split('T')[1]?.substring(0, 8) || slot.slot_start
        : slot.slot_start;
      return {
        time: timeStr,
        available: true,
      };
    });

    // Cache the result with size limit enforcement
    if (availabilityCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry when cache is full
      const firstKey = availabilityCache.keys().next().value;
      if (firstKey) availabilityCache.delete(firstKey);
    }

    availabilityCache.set(cacheKey, {
      data: slots,
      timestamp: Date.now()
    });

    return slots;
  } catch (err) {
    console.error('Error in fetchDentistAvailability:', err);
    return [];
  }
}

/**
 * Invalidate cache for a specific dentist/date
 */
export function invalidateAvailabilityCache(dentistId: string, date: Date | string) {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  availabilityCache.delete(`${dentistId}_${dateStr}`);
}

/**
 * Clear all availability cache
 */
export function clearAvailabilityCache() {
  availabilityCache.clear();
}

/**
 * Checks if a dentist is available on a specific date
 */
export async function isDentistAvailableOnDate(
  dentistId: string,
  date: Date
): Promise<{ available: boolean; reason?: string }> {
  const slots = await fetchDentistAvailability(dentistId, date);

  if (slots.length === 0) {
    return { available: false, reason: 'Not available on this day' };
  }

  const hasAvailable = slots.some(s => s.available);
  return {
    available: hasAvailable,
    reason: hasAvailable ? undefined : 'All slots booked'
  };
}

/**
 * Format time slot for display (e.g., "09:00:00" -> "9:00 AM")
 */
export function formatTimeSlot(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

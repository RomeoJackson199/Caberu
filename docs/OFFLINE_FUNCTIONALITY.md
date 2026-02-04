# Offline Functionality Documentation

## Overview

Caberu now supports full offline data creation and modification with automatic synchronization when the connection is restored. This guide explains how to use the offline features in your code.

## Features

✅ **Persistent Offline Queue** - Operations are saved across page refreshes
✅ **IndexedDB Storage** - Offline data is stored securely in the browser
✅ **Automatic Encryption** - Sensitive PHI data is encrypted at rest
✅ **Auto-Sync** - Data syncs automatically when connection is restored
✅ **Optimistic UI** - Instant feedback for users
✅ **Conflict Resolution** - Smart handling of sync conflicts

## Architecture

### Components

1. **OfflineManager** (`src/lib/offlineManager.ts`)
   - Monitors connection status
   - Manages operation queue with localStorage persistence
   - Handles reconnection and auto-retry

2. **OfflineStorage** (`src/lib/offlineStorage.ts`)
   - IndexedDB wrapper for storing offline data
   - Tracks sync status for each record
   - Provides efficient querying

3. **SyncManager** (`src/lib/syncManager.ts`)
   - Syncs offline data to server when online
   - Handles errors and retries
   - Provides sync status and callbacks

4. **Encryption** (`src/lib/encryption.ts`)
   - Encrypts PHI data using AES-GCM
   - Session-based encryption keys
   - HIPAA-compliant data protection

5. **useOfflineMutation** (`src/hooks/useOfflineMutation.ts`)
   - React hook for offline-aware mutations
   - Automatically handles online/offline scenarios
   - Provides optimistic updates

## Usage

### Basic Example: Create Appointment Offline

```typescript
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

function AppointmentForm() {
  const createAppointment = useOfflineMutation({
    // The actual mutation function (runs when online)
    mutationFn: async (data) => {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return appointment;
    },

    // Query to invalidate after success
    queryKey: ['appointments'],

    // Table and store info
    tableName: 'appointments',
    storeName: 'APPOINTMENTS',

    // Operation type
    operation: 'create',

    // Generate optimistic data for offline mode
    getOptimisticData: (variables) => ({
      id: `temp-${Date.now()}`,
      ...variables,
      created_at: new Date().toISOString(),
    }),

    // Messages
    successMessage: 'Appointment created successfully',
    offlineMessage: 'Appointment saved offline. Will sync when online.',

    // Enable encryption for PHI data
    dataType: 'appointments',
  });

  const handleSubmit = (formData) => {
    createAppointment.mutate({
      patient_id: formData.patientId,
      dentist_id: formData.dentistId,
      appointment_date: formData.date,
      reason: formData.reason,
      notes: formData.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={createAppointment.isPending}>
        {createAppointment.isPending ? 'Saving...' : 'Book Appointment'}
      </button>
    </form>
  );
}
```

### Simplified Supabase Example

For common Supabase operations, use the simplified hook:

```typescript
import { useOfflineSupabaseMutation } from '@/hooks/useOfflineMutation';
import { STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

function PatientForm() {
  const updatePatient = useOfflineSupabaseMutation({
    table: 'patients',
    operation: 'update',
    queryKey: ['patients'],
    storeName: 'PATIENTS',
    successMessage: 'Patient updated',
    dataType: 'patients',
    mutationFn: async (data) => {
      const { data: patient, error } = await supabase
        .from('patients')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return patient;
    },
  });

  return (
    <button onClick={() => updatePatient.mutate({
      id: '123',
      email: 'new@email.com'
    })}>
      Update Patient
    </button>
  );
}
```

### Check Connection Status

```typescript
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

function MyComponent() {
  const { status, isOnline, isOffline, queueSize } = useOfflineStatus();

  return (
    <div>
      <div>Status: {status}</div> {/* 'online' | 'offline' | 'slow' */}
      <div>Pending syncs: {queueSize}</div>
    </div>
  );
}
```

### Manual Queue Operation (Advanced)

For custom operations that don't fit the mutation pattern:

```typescript
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

function MyComponent() {
  const { queueOperation } = useOfflineStatus();

  const handleCustomOperation = async () => {
    queueOperation(
      'Send Email Notification',
      async () => {
        // This function will execute when online
        await supabase.functions.invoke('send-email', {
          body: { to: 'user@example.com', subject: 'Hello' }
        });
      },
      {
        type: 'custom',
        customKey: 'email-notification-123'
      }
    );
  };

  return <button onClick={handleCustomOperation}>Send Email</button>;
}
```

### Access Offline Storage Directly

```typescript
import { offlineStorage, STORES, generateTempId } from '@/lib/offlineStorage';

async function storeCustomData() {
  await offlineStorage.set(STORES.APPOINTMENTS, {
    id: generateTempId('appointment'),
    data: {
      patient_id: '123',
      dentist_id: '456',
      appointment_date: '2026-02-10',
    },
    operation: 'create',
    timestamp: Date.now(),
    synced: false,
    tableName: 'appointments',
  });
}

async function getUnsyncedRecords() {
  const unsynced = await offlineStorage.getUnsynced(STORES.APPOINTMENTS);
  console.log(`${unsynced.length} unsynced appointments`);
}
```

### Monitor Sync Status

```typescript
import { syncManager } from '@/lib/syncManager';

function SyncStatus() {
  const [syncing, setSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    // Check initial count
    syncManager.getUnsyncedCount().then(setUnsyncedCount);

    // Subscribe to sync events
    const unsubscribe = syncManager.onSyncComplete((result) => {
      console.log(`Synced: ${result.synced}/${result.total}`);
      syncManager.getUnsyncedCount().then(setUnsyncedCount);
    });

    return unsubscribe;
  }, []);

  return (
    <div>
      <div>Unsynced records: {unsyncedCount}</div>
      <button
        onClick={() => syncManager.syncAll()}
        disabled={syncManager.isSyncing()}
      >
        Sync Now
      </button>
    </div>
  );
}
```

## Data Encryption

Sensitive fields are automatically encrypted when stored offline. The encryption mapping is defined in `src/lib/encryption.ts`:

```typescript
export const ENCRYPTED_FIELDS = {
  patients: [
    'first_name', 'last_name', 'email', 'phone',
    'address', 'date_of_birth', 'ssn', 'insurance_id',
    'medical_history', 'allergies', 'medications',
  ],
  appointments: ['patient_name', 'notes', 'reason'],
  treatments: ['diagnosis', 'treatment_plan', 'notes', 'prescriptions'],
  billing: ['patient_name', 'credit_card_last4', 'billing_address'],
};
```

To add encryption to a new data type:

1. Add the data type to `ENCRYPTED_FIELDS`
2. Specify `dataType` in your mutation hook
3. Encryption/decryption happens automatically

## Security Considerations

### Encryption Keys
- Keys are generated per session
- Stored in `sessionStorage` (cleared on tab close)
- Automatically cleared on logout
- Uses Web Crypto API (AES-GCM 256-bit)

### Data Storage
- IndexedDB is origin-isolated (per domain)
- Encrypted data is stored as base64
- Temp IDs prevent server ID conflicts
- Sync failures are logged for audit

### Best Practices
1. ✅ Always specify `dataType` for PHI data
2. ✅ Use temp IDs for offline-created records
3. ✅ Clear offline data on logout if needed
4. ✅ Monitor sync errors and retry
5. ⚠️ Don't store payment card data offline
6. ⚠️ Don't rely on offline data as source of truth

## Troubleshooting

### Data not syncing

Check browser console for sync errors:
```javascript
// In browser console
await syncManager.syncAll();
```

### Clear offline data

```javascript
// Clear all offline data (CAUTION!)
await offlineStorage.deleteDatabase();
```

### View offline queue

```javascript
// Check what's queued
const queue = localStorage.getItem('caberu_offline_queue');
console.log(JSON.parse(queue));
```

### View IndexedDB data

1. Open Chrome DevTools
2. Application tab → IndexedDB → CaberuOfflineDB
3. Browse stores to see offline data

## Migration Guide

### Before (Old Code)

```typescript
// Direct Supabase call - fails when offline
const { data, error } = await supabase
  .from('appointments')
  .insert(appointmentData);
```

### After (Offline-Aware)

```typescript
// Use offline mutation hook
const createAppointment = useOfflineMutation({
  mutationFn: async (data) => {
    const result = await supabase.from('appointments').insert(data);
    if (result.error) throw result.error;
    return result.data;
  },
  queryKey: ['appointments'],
  tableName: 'appointments',
  storeName: 'APPOINTMENTS',
  operation: 'create',
  getOptimisticData: (vars) => ({ id: generateTempId(), ...vars }),
  dataType: 'appointments',
});

createAppointment.mutate(appointmentData);
```

## Testing Offline Functionality

### Manual Testing

1. Open DevTools → Network tab
2. Check "Offline" to simulate offline mode
3. Create/update data in the app
4. Check IndexedDB to verify data is stored
5. Uncheck "Offline" to restore connection
6. Verify data syncs to server

### Programmatic Testing

```typescript
// Force offline mode
offlineManager['updateStatus']('offline');

// Create offline data
createAppointment.mutate(testData);

// Verify stored in IndexedDB
const unsynced = await offlineStorage.getUnsynced(STORES.APPOINTMENTS);
expect(unsynced.length).toBe(1);

// Force online and sync
offlineManager['updateStatus']('online');
await syncManager.syncAll();

// Verify synced
const stillUnsynced = await offlineStorage.getUnsynced(STORES.APPOINTMENTS);
expect(stillUnsynced.length).toBe(0);
```

## Performance Considerations

- **IndexedDB**: Fast for <10MB of data, slower for larger datasets
- **Encryption**: Adds ~5-10ms overhead per record
- **Sync**: Processes records sequentially to maintain order
- **Memory**: Queue stored in localStorage (5-10MB limit)

## Future Enhancements

- [ ] Periodic background sync (when app is closed)
- [ ] Conflict resolution UI for merge conflicts
- [ ] Offline-first image/file upload
- [ ] Differential sync (only changed fields)
- [ ] Compression for large offline datasets
- [ ] Multi-device sync coordination

## Support

For issues or questions about offline functionality:
- Check browser console for errors
- Review `logger` output for sync details
- Open GitHub issue with reproduction steps

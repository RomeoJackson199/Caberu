# Gmail-Style Undo Functionality

This application now includes Gmail-style undo functionality for critical user actions. When you perform destructive actions (like deleting items or canceling appointments), you'll see a toast notification with an "Undo" button that gives you 5 seconds to reverse the action.

## Features

✨ **5-second undo window** - Gives users time to reverse accidental actions
🎯 **Optimistic UI updates** - Interface updates immediately for better UX
🔄 **Automatic rollback** - Reverts changes if server operations fail
📦 **Smart invalidation** - Refreshes relevant data after actions complete
🎨 **Toast notifications** - Clean, unobtrusive feedback using Sonner

## How It Works

1. User performs an action (e.g., cancel appointment)
2. UI updates immediately (optimistic update)
3. Toast appears with "Undo" button (5-second countdown)
4. If user clicks "Undo":
   - Action is cancelled
   - Original state is restored
   - Toast confirms the undo
5. If user doesn't click "Undo":
   - Action is committed to the server
   - Queries are invalidated and data refreshes

## Available Undo Hooks

The application provides specialized undo hooks for different domains:

1. **`useUndoManager`** - Base hook for custom undo functionality
2. **`useAppointmentActionsWithUndo`** - Appointment operations
3. **`useInventoryActionsWithUndo`** - Inventory management
4. **`usePatientActionsWithUndo`** - Patient management
5. **`useServiceActionsWithUndo`** - Service management
6. **`useTreatmentActionsWithUndo`** - Treatment plans & prescriptions
7. **`useGenericCRUDWithUndo`** - Generic CRUD operations for any table

## Usage Examples

### 1. Appointment Actions with Undo

```tsx
import { useAppointmentActionsWithUndo } from '@/hooks/useAppointmentActionsWithUndo';

function AppointmentManager() {
  const {
    cancelAppointmentWithUndo,
    declineAppointmentWithUndo,
    markNoShowWithUndo
  } = useAppointmentActionsWithUndo({
    onOptimisticUpdate: (id, updates) => {
      // Update local state immediately
      setAppointments(prev =>
        prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
      );
    },
    onSuccess: (action, appointmentId) => {
      console.log(`${action} completed for ${appointmentId}`);
    },
  });

  const handleCancel = async (appointment) => {
    await cancelAppointmentWithUndo(appointment, () => {
      // Optional: close modal
      setModalOpen(false);
    });
  };

  return (
    <button onClick={() => handleCancel(appointment)}>
      Cancel Appointment
    </button>
  );
}
```

### 2. Inventory Actions with Undo

```tsx
import { useInventoryActionsWithUndo } from '@/hooks/useInventoryActionsWithUndo';

function InventoryManager() {
  const {
    deleteItemWithUndo,
    adjustQuantityWithUndo,
    bulkDeleteWithUndo
  } = useInventoryActionsWithUndo();

  const handleDelete = async (item) => {
    await deleteItemWithUndo(item);
    // Toast will show: "Dental Floss deleted" with Undo button
  };

  const handleQuantityChange = async (item, newQuantity) => {
    await adjustQuantityWithUndo(
      item.id,
      item.name,
      item.quantity,
      newQuantity,
      'correction'
    );
    // Toast will show: "Dental Floss quantity corrected: 50 → 75"
  };

  const handleBulkDelete = async (selectedItems) => {
    await bulkDeleteWithUndo(selectedItems);
    // Toast will show: "15 items deleted" with Undo button
  };

  return (
    <>
      <button onClick={() => handleDelete(item)}>Delete</button>
      <button onClick={() => handleQuantityChange(item, 100)}>
        Adjust Quantity
      </button>
      <button onClick={() => handleBulkDelete(selectedItems)}>
        Delete Selected
      </button>
    </>
  );
}
```

### 3. Custom Actions with useUndoManager

For any custom action, use the base `useUndoManager` hook:

```tsx
import { useUndoManager } from '@/hooks/useUndoManager';
import { supabase } from '@/integrations/supabase/client';

function PatientManager() {
  const { executeWithUndo } = useUndoManager();
  const [patients, setPatients] = useState([]);

  const deletePatientWithUndo = async (patient) => {
    // Save snapshot
    const snapshot = { ...patient };

    // Update UI optimistically
    setPatients(prev => prev.filter(p => p.id !== patient.id));

    await executeWithUndo({
      message: `${patient.name} removed`,
      description: 'Click undo to restore',
      undoDelay: 5000, // 5 seconds to undo
      action: async () => {
        // Actual deletion
        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id);

        if (error) throw error;
      },
      undo: async () => {
        // Restore the patient
        setPatients(prev => [...prev, snapshot]);

        const { error } = await supabase
          .from('patients')
          .insert([snapshot]);

        if (error) throw error;
      },
      invalidateQueries: [['patients']],
      onSuccess: () => {
        console.log('Patient deleted successfully');
      },
      onError: (error) => {
        console.error('Failed to delete patient:', error);
      },
    });
  };

  return (
    <button onClick={() => deletePatientWithUndo(patient)}>
      Delete Patient
    </button>
  );
}
```

### 4. Patient Management with Undo

```tsx
import { usePatientActionsWithUndo } from '@/hooks/usePatientActionsWithUndo';

function PatientManagement() {
  const {
    deletePatientWithUndo,
    deleteNoteWithUndo,
    deleteAllergyWithUndo,
    archivePatientWithUndo,
    bulkDeletePatientsWithUndo
  } = usePatientActionsWithUndo();

  const handleDeletePatient = async (patient) => {
    await deletePatientWithUndo(patient);
    // Toast shows: "John Smith deleted" with Undo button
  };

  const handleDeleteNote = async (note) => {
    await deleteNoteWithUndo(note);
    // Toast shows: "Note deleted: 'Allergy information'"
  };

  const handleArchive = async (patient) => {
    await archivePatientWithUndo(patient);
    // Soft delete - marks as archived instead of deleting
  };

  return (
    <>
      <button onClick={() => handleDeletePatient(patient)}>Delete</button>
      <button onClick={() => handleArchive(patient)}>Archive</button>
    </>
  );
}
```

### 5. Service Management with Undo

```tsx
import { useServiceActionsWithUndo } from '@/hooks/useServiceActionsWithUndo';

function ServiceManager() {
  const {
    deleteServiceWithUndo,
    toggleServiceStatusWithUndo,
    updateServicePriceWithUndo,
    bulkDeleteServicesWithUndo
  } = useServiceActionsWithUndo();

  const handleDelete = async (service) => {
    await deleteServiceWithUndo(service);
    // Toast shows: "Teeth Cleaning deleted"
  };

  const handleToggleStatus = async (service) => {
    await toggleServiceStatusWithUndo(service);
    // Toast shows: "Teeth Cleaning activated/deactivated"
  };

  const handlePriceChange = async (service, newPrice) => {
    await updateServicePriceWithUndo(service, newPrice * 100); // Convert to cents
    // Toast shows: "Service price updated: €50 → €60"
  };

  return (
    <>
      <button onClick={() => handleDelete(service)}>Delete</button>
      <button onClick={() => handleToggleStatus(service)}>
        {service.is_active ? 'Deactivate' : 'Activate'}
      </button>
    </>
  );
}
```

### 6. Treatment Plans & Prescriptions with Undo

```tsx
import { useTreatmentActionsWithUndo } from '@/hooks/useTreatmentActionsWithUndo';

function TreatmentManager() {
  const {
    deleteTemplateWithUndo,
    deleteTreatmentPlanWithUndo,
    cancelTreatmentPlanWithUndo,
    deletePrescriptionWithUndo,
    cancelPrescriptionWithUndo,
    completePrescriptionWithUndo
  } = useTreatmentActionsWithUndo();

  const handleDeleteTemplate = async (template) => {
    await deleteTemplateWithUndo(template);
    // Toast shows: "Template 'Root Canal Package' deleted"
  };

  const handleCancelPlan = async (plan) => {
    await cancelTreatmentPlanWithUndo(plan);
    // Changes status to 'cancelled' with undo option
  };

  const handleDeletePrescription = async (prescription, patientName) => {
    await deletePrescriptionWithUndo(prescription, patientName);
    // Toast shows: "Prescription deleted: Amoxicillin for John Smith"
  };

  const handleCompletePrescription = async (prescription) => {
    await completePrescriptionWithUndo(prescription);
    // Marks as completed with undo option
  };

  return (
    <>
      <button onClick={() => handleDeleteTemplate(template)}>Delete Template</button>
      <button onClick={() => handleCancelPlan(plan)}>Cancel Plan</button>
      <button onClick={() => handleDeletePrescription(prescription, patient.name)}>
        Delete Prescription
      </button>
    </>
  );
}
```

### 7. Generic CRUD with Undo (For Any Table)

The most flexible option - use for staff, invoices, or any other entity:

```tsx
import { useGenericCRUDWithUndo } from '@/hooks/useGenericCRUDWithUndo';

function StaffManager() {
  // Configure for staff members
  const staffCrud = useGenericCRUDWithUndo({
    tableName: 'staff_members',
    entityName: 'staff member',
    queryKeys: [['staff'], ['team-members']],
    getDisplayName: (staff) => `${staff.first_name} ${staff.last_name}`,
  });

  // Configure for invoices
  const invoiceCrud = useGenericCRUDWithUndo({
    tableName: 'invoices',
    entityName: 'invoice',
    queryKeys: [['invoices']],
    getDisplayName: (invoice) => `Invoice #${invoice.number}`,
  });

  const handleDeleteStaff = async (staff) => {
    await staffCrud.deleteWithUndo(staff);
  };

  const handleToggleStaffActive = async (staff) => {
    await staffCrud.toggleFieldWithUndo(staff, 'is_active', 'Staff member status changed');
  };

  const handleUpdateRole = async (staff, newRole) => {
    await staffCrud.updateFieldWithUndo(staff, 'role', newRole, 'Staff role updated');
  };

  const handleArchiveStaff = async (staff) => {
    await staffCrud.archiveWithUndo(staff);
  };

  const handleBulkDelete = async (selectedStaff) => {
    await staffCrud.bulkDeleteWithUndo(selectedStaff);
  };

  return (
    <>
      <button onClick={() => handleDeleteStaff(staff)}>Delete</button>
      <button onClick={() => handleToggleStaffActive(staff)}>Toggle Active</button>
      <button onClick={() => handleArchiveStaff(staff)}>Archive</button>
      <button onClick={() => handleBulkDelete(selectedStaff)}>
        Delete Selected
      </button>
    </>
  );
}
```

### 8. Optimistic Updates Without Undo

For actions that don't need undo but want optimistic updates:

```tsx
import { useUndoManager } from '@/hooks/useUndoManager';

function QuickActions() {
  const { executeOptimistic } = useUndoManager();

  const markAsPaid = async (invoiceId) => {
    // Update UI immediately
    updateInvoiceStatus(invoiceId, 'paid');

    await executeOptimistic({
      message: 'Marked as paid',
      action: async () => {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', invoiceId);

        if (error) throw error;
      },
      rollback: () => {
        // Revert UI change if action fails
        updateInvoiceStatus(invoiceId, 'pending');
      },
      invalidateQueries: [['invoices']],
    });
  };
}
```

## API Reference

### `useUndoManager()`

Base hook for undo functionality.

#### `executeWithUndo(options)`

Execute an action with undo capability.

**Options:**
- `action: () => Promise<T>` - The action to execute after undo delay
- `undo: () => Promise<void>` - Function to restore previous state
- `message: string` - Success message for toast
- `description?: string` - Optional description
- `undoDelay?: number` - Delay before executing (default: 5000ms)
- `invalidateQueries?: string[][]` - Query keys to invalidate
- `onSuccess?: (result: T) => void` - Success callback
- `onUndo?: () => void` - Undo callback
- `onError?: (error: Error) => void` - Error callback

#### `executeOptimistic(options)`

Execute with optimistic update but no undo button.

**Options:**
- `action: () => Promise<T>` - The action to execute
- `rollback: () => void` - Function to revert optimistic update
- `message: string` - Success message
- `description?: string` - Optional description
- `invalidateQueries?: string[][]` - Query keys to invalidate
- `onSuccess?: (result: T) => void` - Success callback
- `onError?: (error: Error) => void` - Error callback

### `useAppointmentActionsWithUndo(options)`

Appointment-specific actions with undo.

**Options:**
- `businessId?: string` - Business ID for filtering
- `onSuccess?: (action, appointmentId) => void` - Success callback
- `onOptimisticUpdate?: (id, updates) => void` - Optimistic update handler

**Returns:**
- `cancelAppointmentWithUndo(appointment, closeModal?)` - Cancel with undo
- `declineAppointmentWithUndo(appointment, closeModal?)` - Decline with undo
- `markNoShowWithUndo(appointment, closeModal?)` - Mark no-show with undo

### `useInventoryActionsWithUndo()`

Inventory-specific actions with undo.

**Returns:**
- `deleteItemWithUndo(item)` - Delete item with undo
- `adjustQuantityWithUndo(itemId, name, oldQty, newQty, reason)` - Adjust quantity
- `bulkDeleteWithUndo(items)` - Bulk delete with undo

### `usePatientActionsWithUndo()`

Patient management actions with undo.

**Returns:**
- `deletePatientWithUndo(patient)` - Delete patient with undo
- `deleteNoteWithUndo(note)` - Delete patient note with undo
- `deleteAllergyWithUndo(allergy, patientName?)` - Delete allergy record with undo
- `archivePatientWithUndo(patient)` - Archive patient (soft delete) with undo
- `bulkDeletePatientsWithUndo(patients)` - Bulk delete patients with undo

### `useServiceActionsWithUndo()`

Service management actions with undo.

**Returns:**
- `deleteServiceWithUndo(service)` - Delete service with undo
- `toggleServiceStatusWithUndo(service, newStatus?)` - Toggle active status with undo
- `updateServicePriceWithUndo(service, newPriceCents)` - Update price with undo
- `bulkDeleteServicesWithUndo(services)` - Bulk delete services with undo
- `bulkToggleServicesWithUndo(services, targetStatus)` - Bulk toggle status with undo

### `useTreatmentActionsWithUndo()`

Treatment plan and prescription actions with undo.

**Returns:**
- `deleteTemplateWithUndo(template)` - Delete treatment template with undo
- `deleteTreatmentPlanWithUndo(plan)` - Delete treatment plan with undo
- `cancelTreatmentPlanWithUndo(plan)` - Cancel treatment plan with undo
- `deletePrescriptionWithUndo(prescription, patientName?)` - Delete prescription with undo
- `cancelPrescriptionWithUndo(prescription)` - Cancel prescription with undo
- `completePrescriptionWithUndo(prescription)` - Mark prescription complete with undo
- `bulkDeleteTemplatesWithUndo(templates)` - Bulk delete templates with undo

### `useGenericCRUDWithUndo(options)`

Generic CRUD operations for any table.

**Options:**
- `tableName: string` - Supabase table name
- `entityName: string` - Entity name for display (e.g., "staff member")
- `queryKeys: string[][]` - Query keys to invalidate
- `getDisplayName?: (entity) => string` - Function to get display name
- `undoDelay?: number` - Custom undo delay (default: 5000ms)

**Returns:**
- `deleteWithUndo(entity)` - Delete entity with undo
- `updateFieldWithUndo(entity, fieldName, newValue, message?)` - Update single field with undo
- `updateFieldsWithUndo(entity, updates, message?)` - Update multiple fields with undo
- `toggleFieldWithUndo(entity, fieldName, message?)` - Toggle boolean field with undo
- `archiveWithUndo(entity, archiveField?)` - Archive entity with undo
- `bulkDeleteWithUndo(entities)` - Bulk delete with undo
- `bulkUpdateFieldWithUndo(entities, fieldName, newValue, message?)` - Bulk update field with undo

## Best Practices

1. **Use undo for destructive actions**: Deletions, cancellations, significant status changes
2. **Don't use undo for positive actions**: Confirmations, creations (unless they're high-risk)
3. **Keep undo delays short**: 5 seconds is the sweet spot (like Gmail)
4. **Provide clear messages**: Tell users exactly what happened and what undo does
5. **Handle errors gracefully**: Both action errors and undo errors
6. **Invalidate queries**: Always refresh data after actions complete

## Customization

### Custom Undo Delay

```tsx
await executeWithUndo({
  // ... other options
  undoDelay: 10000, // 10 seconds instead of 5
});
```

### Custom Toast Appearance

The toast styling is handled by Sonner and follows your theme settings automatically. The "Undo" button inherits the primary button styles from your theme.

### Multiple Actions

Users can perform multiple undoable actions. Each gets its own toast with independent undo buttons and timers.

## Technical Details

- **Toast Library**: Sonner (already integrated)
- **State Management**: TanStack React Query
- **Optimistic Updates**: Using React refs for snapshots
- **Error Handling**: Automatic rollback on failure
- **Query Invalidation**: Automatic refresh after completion

## Browser Support

Works in all modern browsers that support:
- ES6+ (async/await, Promises, Map)
- React 18+
- TanStack React Query v5+

## Migration Guide

If you're currently using `useOptimisticAppointmentActions`, you can gradually migrate:

```tsx
// Old way (no undo)
import { useOptimisticAppointmentActions } from '@/hooks/useOptimisticAppointmentActions';
const { cancelAppointment } = useOptimisticAppointmentActions();

// New way (with undo)
import { useAppointmentActionsWithUndo } from '@/hooks/useAppointmentActionsWithUndo';
const { cancelAppointmentWithUndo } = useAppointmentActionsWithUndo();
```

Both hooks can coexist. The new undo hooks are drop-in replacements with enhanced UX.

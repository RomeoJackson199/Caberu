/**
 * @deprecated Use PractitionerPicker from '@/components/shared/PractitionerPicker' instead
 * This file is kept for backward compatibility
 */

import { PractitionerPicker, type Practitioner } from './shared/PractitionerPicker';

// Re-export with old interface for compatibility
interface DentistSelectionProps {
  onSelectDentist: (dentist: Practitioner) => void;
  selectedDentistId?: string;
}

export const DentistSelection = ({ onSelectDentist, selectedDentistId }: DentistSelectionProps) => (
  <PractitionerPicker
    variant="compact"
    selectedId={selectedDentistId}
    onSelect={onSelectDentist}
  />
);

export type { Practitioner as Dentist };

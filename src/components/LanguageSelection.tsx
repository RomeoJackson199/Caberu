/**
 * @deprecated Use LanguagePicker from '@/components/shared/LanguagePicker' instead
 * This file is kept for backward compatibility
 */

import { LanguagePicker } from './shared/LanguagePicker';

interface LanguageSelectionProps {
  onLanguageSelected: () => void;
}

export const LanguageSelection = ({ onLanguageSelected }: LanguageSelectionProps) => {
  return <LanguagePicker variant="cards" onSelect={onLanguageSelected} />;
};
/**
 * IntakeSummaryInput Component
 * Allows patients to add symptoms/reason for visit during booking
 * 
 * Rules:
 * - Summary is stored only if appointment is created
 * - Attached to the appointment
 * - Clearly labeled as "patient-reported"
 * - Visible in Appointment Detail (Dentist) as read-only context
 * - Not editable after booking (new info goes in clinical notes)
 * - Never treated as diagnosis
 */

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Edit2, 
  Check, 
  X, 
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntakeSummaryInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Maximum characters allowed */
  maxLength?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Optional: pre-filled from AI chat */
  aiSuggested?: boolean;
  className?: string;
}

export function IntakeSummaryInput({
  value,
  onChange,
  maxLength = 500,
  disabled = false,
  placeholder = "Describe your symptoms or reason for this visit (e.g., tooth pain, cleaning, follow-up)...",
  aiSuggested = false,
  className,
}: IntakeSummaryInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isOverLimit = charCount > maxLength;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="intake-summary" className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Reason for Visit
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        {aiSuggested && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Stethoscope className="h-3 w-3" />
            AI Suggested
          </Badge>
        )}
      </div>
      
      <div className="relative">
        <Textarea
          id="intake-summary"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= maxLength) {
              onChange(e.target.value);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'min-h-[100px] resize-none',
            isOverLimit && 'border-destructive focus-visible:ring-destructive',
            isFocused && 'border-primary'
          )}
        />
        <div className={cn(
          'absolute bottom-2 right-2 text-xs',
          isNearLimit ? (isOverLimit ? 'text-destructive' : 'text-warning') : 'text-muted-foreground'
        )}>
          {charCount}/{maxLength}
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        This summary helps your dentist prepare for your visit. It is not a medical diagnosis.
      </p>
    </div>
  );
}

/**
 * IntakeSummaryDisplay - Read-only display for dentists
 */
interface IntakeSummaryDisplayProps {
  summary: string;
  patientName?: string;
  className?: string;
}

export function IntakeSummaryDisplay({
  summary,
  patientName,
  className,
}: IntakeSummaryDisplayProps) {
  if (!summary?.trim()) return null;

  return (
    <Card className={cn('border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20', className)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <FileText className="h-4 w-4" />
          Patient-Reported Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {summary}
        </p>
        <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Reported by {patientName || 'patient'} at time of booking. Not a diagnosis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * IntakeSummaryEdit - Editable version for booking confirmation
 */
interface IntakeSummaryEditProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

export function IntakeSummaryEdit({
  value,
  onChange,
  maxLength = 500,
  className,
}: IntakeSummaryEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            Your Symptoms
          </Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 px-2 text-xs"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
        <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
          {value || <span className="text-muted-foreground italic">No symptoms described</span>}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Your Symptoms
        </Label>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-7 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-7 px-2 text-primary"
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <Textarea
        value={editValue}
        onChange={(e) => {
          if (e.target.value.length <= maxLength) {
            setEditValue(e.target.value);
          }
        }}
        className="min-h-[80px]"
        autoFocus
      />
    </div>
  );
}

import React, { useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Phone, Mail, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    avatar_url?: string;
    medical_history?: string;
    created_at: string;
}

interface VirtualizedPatientListProps {
    patients: Patient[];
    selectedPatientId?: string | null;
    onSelectPatient: (patient: Patient) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
    height?: number;
    itemHeight?: number;
}

export function VirtualizedPatientList({
    patients,
    selectedPatientId,
    onSelectPatient,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    height = 600,
    itemHeight = 80,
}: VirtualizedPatientListProps) {
    const listRef = useRef<List>(null);

    // Patient row renderer
    const PatientRow = useCallback(
        ({ index, style }: { index: number; style: React.CSSProperties }) => {
            // Last item is "Load More" button if hasMore
            if (hasMore && index === patients.length) {
                return (
                    <div style={style} className="flex items-center justify-center p-4">
                        <Button
                            variant="outline"
                            onClick={onLoadMore}
                            disabled={isLoading}
                            className="w-full max-w-xs"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <ChevronDown className="h-4 w-4 mr-2" />
                            )}
                            Load More Patients
                        </Button>
                    </div>
                );
            }

            const patient = patients[index];
            if (!patient) return null;

            const isSelected = patient.id === selectedPatientId;
            const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase();
            const hasAllergy = patient.medical_history?.toLowerCase().includes('allerg');

            return (
                <div style={style} className="px-2 py-1">
                    <Card
                        className={cn(
                            'p-3 cursor-pointer transition-all duration-200 hover:shadow-md',
                            isSelected && 'ring-2 ring-primary bg-primary/5'
                        )}
                        onClick={() => onSelectPatient(patient)}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={patient.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">
                                        {patient.first_name} {patient.last_name}
                                    </span>
                                    {hasAllergy && (
                                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                            Allergy
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                    {patient.email && (
                                        <span className="flex items-center gap-1 truncate">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate">{patient.email}</span>
                                        </span>
                                    )}
                                    {patient.phone && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {patient.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            );
        },
        [patients, selectedPatientId, onSelectPatient, hasMore, onLoadMore, isLoading]
    );

    // Calculate item count (add 1 for Load More button if hasMore)
    const itemCount = hasMore ? patients.length + 1 : patients.length;

    if (patients.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>No patients found</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <List
                ref={listRef}
                height={height}
                itemCount={itemCount}
                itemSize={itemHeight}
                width="100%"
                className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            >
                {PatientRow}
            </List>

            {isLoading && patients.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
        </div>
    );
}

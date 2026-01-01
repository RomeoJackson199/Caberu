/**
 * TreatmentPlanSummaryCard - Compact collapsed view for Appointment Detail
 * 
 * Shows minimal info by default, opens editor sheet on interaction.
 * Follows the principle: "If the dentist has not decided yet, the UI must not look like a form."
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Pencil, Loader2, Link } from "lucide-react";
import { formatCurrency, formatPlanStatus, getPlanStatusColor } from "./types";

interface TreatmentPlanSummaryCardProps {
  existingPlan: {
    id: string;
    title: string;
    status: string;
    version: number;
    total_estimated_cents: number;
    currency: string;
    items?: { id: string }[];
  } | null;
  isLoading: boolean;
  onOpenEditor: () => void;
  onLinkExisting: () => void;
  isEditable: boolean;
}

export function TreatmentPlanSummaryCard({
  existingPlan,
  isLoading,
  onOpenEditor,
  onLinkExisting,
  isEditable,
}: TreatmentPlanSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading plan...</span>
        </CardContent>
      </Card>
    );
  }

  // No plan yet - show simple prompt
  if (!existingPlan) {
    return (
      <Card className="bg-muted/30 hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Treatment Plan</p>
                <p className="text-xs text-muted-foreground">No plan linked yet</p>
              </div>
            </div>
            {isEditable && (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={onLinkExisting}>
                  <Link className="h-4 w-4 mr-1.5" />
                  Link Existing
                </Button>
                <Button size="sm" onClick={onOpenEditor}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create New
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Existing plan - show summary
  const itemCount = existingPlan.items?.length || 0;

  return (
    <Card 
      className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onOpenEditor}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">
                  {existingPlan.title || "Treatment Plan"}
                </p>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPlanStatusColor(existingPlan.status as any)}`}
                >
                  {formatPlanStatus(existingPlan.status as any)}
                </Badge>
                {existingPlan.version > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    v{existingPlan.version}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {itemCount} {itemCount === 1 ? "item" : "items"} • {formatCurrency(existingPlan.total_estimated_cents, existingPlan.currency)}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEditor();
            }}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            {isEditable ? "Edit" : "View"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

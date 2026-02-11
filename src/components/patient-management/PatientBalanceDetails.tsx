import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Receipt,
  ArrowUpRight,
  Ban,
} from "lucide-react";
import { format } from "date-fns";

interface BalanceItem {
  id: string;
  type: "payment_request" | "invoice";
  description: string;
  amount: number;
  status: string;
  created_at: string;
}

interface PatientBalanceDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  dentistId: string;
  onBalanceUpdated?: () => void;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  paid: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Paid",
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Pending",
  },
  sent: {
    icon: <ArrowUpRight className="h-4 w-4" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Sent",
  },
  overdue: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "bg-red-50 text-red-700 border-red-200",
    label: "Overdue",
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-50 text-red-700 border-red-200",
    label: "Failed",
  },
  cancelled: {
    icon: <Ban className="h-4 w-4" />,
    color: "bg-gray-50 text-gray-500 border-gray-200",
    label: "Cancelled",
  },
  draft: {
    icon: <Receipt className="h-4 w-4" />,
    color: "bg-gray-50 text-gray-600 border-gray-200",
    label: "Draft",
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

export function PatientBalanceDetails({
  open,
  onOpenChange,
  patientId,
  patientName,
  dentistId,
  onBalanceUpdated,
}: PatientBalanceDetailsProps) {
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "outstanding" | "paid">("outstanding");
  const { toast } = useToast();
  const { businessId } = useBusinessContext();

  const fetchBalanceItems = useCallback(async () => {
    if (!open) return;
    setLoading(true);

    try {
      const results: BalanceItem[] = [];

      // Fetch payment requests
      let prQuery = supabase
        .from("payment_requests")
        .select("id, amount, description, status, created_at")
        .eq("patient_id", patientId)
        .eq("dentist_id", dentistId)
        .order("created_at", { ascending: false });

      if (businessId) {
        prQuery = prQuery.eq("business_id", businessId);
      }

      const { data: paymentRequests } = await prQuery;

      for (const pr of paymentRequests || []) {
        results.push({
          id: pr.id,
          type: "payment_request",
          description: pr.description || "Payment Request",
          amount: pr.amount || 0,
          status: pr.status,
          created_at: pr.created_at,
        });
      }

      // Fetch invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, patient_amount_cents, status, created_at")
        .eq("patient_id", patientId)
        .eq("dentist_id", dentistId)
        .order("created_at", { ascending: false });

      for (const inv of invoices || []) {
        results.push({
          id: inv.id,
          type: "invoice",
          description: "Invoice",
          amount: inv.patient_amount_cents || 0,
          status: inv.status,
          created_at: inv.created_at,
        });
      }

      // Sort by date descending
      results.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(results);
    } catch (error) {
      console.error("Error fetching balance items:", error);
    } finally {
      setLoading(false);
    }
  }, [open, patientId, dentistId, businessId]);

  useEffect(() => {
    fetchBalanceItems();
  }, [fetchBalanceItems]);

  const handleMarkAsPaid = async (item: BalanceItem) => {
    setUpdatingId(item.id);
    try {
      const table = item.type === "payment_request" ? "payment_requests" : "invoices";
      const { error } = await supabase
        .from(table)
        .update({ status: "paid" })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Marked as paid",
        description: `${item.type === "payment_request" ? "Payment request" : "Invoice"} marked as paid.`,
      });

      // Update local state
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "paid" } : i))
      );

      onBalanceUpdated?.();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (item: BalanceItem) => {
    setUpdatingId(item.id);
    try {
      const table = item.type === "payment_request" ? "payment_requests" : "invoices";
      const { error } = await supabase
        .from(table)
        .update({ status: "cancelled" })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Cancelled",
        description: `${item.type === "payment_request" ? "Payment request" : "Invoice"} has been cancelled.`,
      });

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "cancelled" } : i))
      );

      onBalanceUpdated?.();
    } catch (error) {
      console.error("Error cancelling:", error);
      toast({
        title: "Error",
        description: "Failed to cancel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === "outstanding") {
      return item.status !== "paid" && item.status !== "cancelled";
    }
    if (filter === "paid") {
      return item.status === "paid";
    }
    return true;
  });

  const totalOutstanding = items
    .filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPaid = items
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  const formatAmount = (cents: number) => `\u20AC${(cents / 100).toFixed(2)}`;

  const isActionable = (status: string) =>
    status !== "paid" && status !== "cancelled";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader className="space-y-1 pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-dental-primary" />
            Balance Details
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {patientName}
          </SheetDescription>
        </SheetHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <div className="rounded-xl border bg-red-50/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Outstanding</p>
            <p className="text-xl font-bold text-red-600">{formatAmount(totalOutstanding)}</p>
          </div>
          <div className="rounded-xl border bg-emerald-50/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Paid</p>
            <p className="text-xl font-bold text-emerald-600">{formatAmount(totalPaid)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="pb-3">
          <Select value={filter} onValueChange={(v: "all" | "outstanding" | "paid") => setFilter(v)}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outstanding">Outstanding Only</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="all">All Items</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Items list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === "outstanding"
                  ? "No outstanding balances"
                  : filter === "paid"
                    ? "No paid items"
                    : "No balance items found"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const config = getStatusConfig(item.status);
              const isUpdating = updatingId === item.id;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="group rounded-xl border bg-card p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium px-2 py-0.5 ${config.color}`}
                        >
                          <span className="mr-1">{config.icon}</span>
                          {config.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {item.type === "payment_request" ? "Payment Req." : "Invoice"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(item.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <p className="text-base font-bold tabular-nums whitespace-nowrap">
                      {formatAmount(item.amount)}
                    </p>
                  </div>

                  {isActionable(item.status) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isUpdating}
                        onClick={() => handleMarkAsPaid(item)}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Mark as Paid
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-muted-foreground"
                        disabled={isUpdating}
                        onClick={() => handleCancel(item)}
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

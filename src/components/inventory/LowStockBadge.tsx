import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LowStockBadgeProps {
  dentistId: string;
  threshold?: number;
}

export function LowStockBadge({ dentistId, threshold = 10 }: LowStockBadgeProps) {
  const [open, setOpen] = useState(false);

  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ['low-stock-items', dentistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('dentist_id', dentistId)
        .lte('quantity', threshold)
        .order('quantity', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const count = lowStockItems?.length || 0;

  if (isLoading || count === 0) return null;

  return (
    <>
      <Badge
        variant="destructive"
        className="cursor-pointer hover:bg-destructive/90"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        {count} Low Stock
      </Badge>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Items
            </DialogTitle>
            <DialogDescription>Items that need to be reordered soon.</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.min_threshold}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.quantity === 0 ? "destructive" : "secondary"}
                        className={item.quantity === 0 ? "" : "bg-orange-100 text-orange-800"}
                      >
                        {item.quantity === 0 ? "Out of Stock" : "Low"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

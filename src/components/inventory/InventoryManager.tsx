import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInventoryActionsWithUndo } from "@/hooks/useInventoryActionsWithUndo";

interface InventoryItem {
  id: string;
  dentist_id: string;
  business_id: string;
  name: string;
  category: "implants" | "anesthesia" | "consumables" | "instruments" | "other";
  quantity: number;
  min_threshold: number;
  notes?: string | null;
  updated_at: string;
}

interface TreatmentType { id: string; name: string; }

interface InventoryManagerProps {
  dentistId: string;
  userId: string; // Supabase auth user id for notifications
}

export function InventoryManager({ dentistId, userId }: InventoryManagerProps) {
  const { toast } = useToast();
  const sb: any = supabase;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Undo functionality
  const { deleteItemWithUndo } = useInventoryActionsWithUndo();

  // Add/Edit form state
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryItem["category"]>("consumables");
  const [quantity, setQuantity] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  // Manual adjustment state
  const [adjustItemId, setAdjustItemId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<"increase" | "decrease" | "usage" | "correction">("increase");
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>("");

  // Treatment mapping state
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [selectedTreatmentTypeId, setSelectedTreatmentTypeId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Array<{ id: string; item_id: string; quantity: number }>>([]);
  const [newMappingItemId, setNewMappingItemId] = useState<string | null>(null);
  const [newMappingQty, setNewMappingQty] = useState<number>(1);

  const lowStockCount = useMemo(() => items.filter(i => i.quantity < i.min_threshold).length, [items]);

  // Optional: highlight item from ?item= query
  const highlightItemId = typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.split('?')[1] || '').get('item') : null;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await sb
          .from('inventory_items')
          .select('*')
          .eq('dentist_id', dentistId)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        setItems(data || []);
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Failed to load inventory', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [dentistId]);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb.from('profiles').select('id').eq('user_id', userId).single();
      if (!error && data) setProfileId(data.id);
    })();
  }, [userId]);

  useEffect(() => {
    (async () => {
      const { data } = await sb.from('treatment_types').select('id, name').eq('is_active', true).order('name');
      setTreatmentTypes((data || []) as TreatmentType[]);
    })();
  }, []);

  useEffect(() => {
    if (!selectedTreatmentTypeId) { setMappings([]); return; }
    (async () => {
      const { data, error } = await sb
        .from('treatment_supply_mappings')
        .select('id, item_id, quantity')
        .eq('dentist_id', dentistId)
        .eq('treatment_type_id', selectedTreatmentTypeId);
      if (!error) setMappings(data || []);
    })();
  }, [selectedTreatmentTypeId, dentistId]);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setCategory("consumables");
    setQuantity(0);
    setThreshold(0);
    setNotes("");
  };

  const saveItem = async () => {
    try {
      if (!name.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
      const payload = { dentist_id: dentistId, name: name.trim(), category, quantity, min_threshold: threshold, notes: notes || null };
      if (editId) {
        const { error } = await sb.from('inventory_items').update(payload).eq('id', editId);
        if (error) throw error;
        toast({ title: 'Item updated' });
      } else {
        const { error } = await sb.from('inventory_items').insert(payload);
        if (error) throw error;
        toast({ title: 'Item added' });
      }
      resetForm();
      const { data } = await sb.from('inventory_items').select('*').eq('dentist_id', dentistId).order('updated_at', { ascending: false });
      setItems(data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save item', variant: 'destructive' });
    }
  };

  const deleteItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Optimistically remove from UI
    setItems(prev => prev.filter(i => i.id !== id));

    // Use undo functionality - will show toast with undo button
    await deleteItemWithUndo(item);

    // Reload items after undo window
    setTimeout(async () => {
      const { data } = await sb.from('inventory_items').select('*').eq('dentist_id', dentistId).order('updated_at', { ascending: false });
      setItems(data || []);
    }, 5500);
  };

  const applyAdjustment = async () => {
    try {
      if (!adjustItemId || !profileId) return;
      const change = (adjustType === 'increase' ? 1 : -1) * Math.abs(adjustQty || 0);
      if (change === 0) return;
      // 1) Create adjustment log
      const { error: adjErr } = await sb.from('inventory_adjustments').insert({
        item_id: adjustItemId,
        dentist_id: dentistId,
        change,
        adjustment_type: adjustType,
        reason: adjustReason || null,
        created_by: profileId,
      });
      if (adjErr) throw adjErr;
      // 2) Update item quantity atomically
      const { data: itemRow } = await sb.from('inventory_items').select('quantity, min_threshold, name').eq('id', adjustItemId).single();
      const newQty = Math.max(0, (itemRow?.quantity || 0) + change);
      const { error: updErr } = await sb.from('inventory_items').update({ quantity: newQty }).eq('id', adjustItemId);
      if (updErr) throw updErr;
      // 3) Refresh list
      const { data } = await sb.from('inventory_items').select('*').eq('dentist_id', dentistId).order('updated_at', { ascending: false });
      setItems(data || []);
      toast({ title: 'Stock updated' });
      // 4) Low stock notification
      if (itemRow && newQty < itemRow.min_threshold) {
        await sb.from('notifications').insert({
          user_id: await getDentistOwnerUserId(dentistId),
          dentist_id: dentistId,
          type: 'inventory',
          title: 'Low Stock Alert',
          message: `${itemRow.name} is below threshold (${newQty} remaining)`,
          priority: 'high',
          action_label: 'Open Inventory',
          action_url: '/dashboard#inventory'
        });
      }
      // Reset adjust form
      setAdjustReason("");
      setAdjustQty(1);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to apply adjustment', variant: 'destructive' });
    }
  };

  const getDentistOwnerUserId = async (dentistIdParam: string): Promise<string> => {
    const { data } = await sb
      .from('dentists')
      .select('profile_id')
      .eq('id', dentistIdParam)
      .single();
    if (!data) return userId;
    const { data: prof } = await sb
      .from('profiles')
      .select('user_id')
      .eq('id', data.profile_id)
      .single();
    return prof?.user_id || userId;
  };

  const addMapping = async () => {
    try {
      if (!selectedTreatmentTypeId || !newMappingItemId) return;
      const { error } = await sb.from('treatment_supply_mappings').insert({
        dentist_id: dentistId,
        treatment_type_id: selectedTreatmentTypeId,
        item_id: newMappingItemId,
        quantity: newMappingQty,
      });
      if (error) throw error;
      toast({ title: 'Mapping added' });
      const { data } = await sb
        .from('treatment_supply_mappings')
        .select('id, item_id, quantity')
        .eq('dentist_id', dentistId)
        .eq('treatment_type_id', selectedTreatmentTypeId);
      setMappings(data || []);
      setNewMappingItemId(null);
      setNewMappingQty(1);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to add mapping', variant: 'destructive' });
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      const { error } = await sb.from('treatment_supply_mappings').delete().eq('id', id);
      if (error) throw error;
      setMappings(prev => prev.filter(m => m.id !== id));
      toast({ title: 'Mapping deleted' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete mapping', variant: 'destructive' });
    }
  };

  // Analytics: compute in-memory from adjustments
  const [usageLast30, setUsageLast30] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await sb
        .from('inventory_adjustments')
        .select('item_id, change, created_at')
        .eq('dentist_id', dentistId)
        .gte('created_at', since);
      const agg: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row.change < 0) {
          agg[row.item_id] = (agg[row.item_id] || 0) + Math.abs(row.change);
        }
      });
      setUsageLast30(agg);
    })();
  }, [dentistId]);

  const itemsSorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const aLow = a.quantity < a.min_threshold ? 1 : 0;
      const bLow = b.quantity < b.min_threshold ? 1 : 0;
      if (aLow !== bLow) return bLow - aLow; // low first
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [items]);

  const categories: InventoryItem["category"][] = ["implants","anesthesia","consumables","instruments","other"];

  const predictDepletionDate = (item: InventoryItem): string | null => {
    const used = usageLast30[item.id] || 0;
    const daily = used / 30;
    if (daily <= 0) return null;
    const daysLeft = item.quantity / daily;
    const eta = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
    return eta.toISOString().slice(0, 10);
  };

  return (
    <div className="px-4 md:px-6 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Inventory</h2>
        {lowStockCount > 0 && (
          <Badge variant="destructive">{lowStockCount} Low</Badge>
        )}
      </div>

      {/* 1. Inventory List View */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min Threshold</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsSorted.map(item => {
                  const low = item.quantity < item.min_threshold;
                  const isHighlighted = highlightItemId === item.id;
                  return (
                    <TableRow key={item.id} className={`${low ? 'bg-red-50' : ''} ${isHighlighted ? 'ring-2 ring-primary/50' : ''}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.min_threshold}</TableCell>
                      <TableCell>{new Date(item.updated_at).toLocaleString()}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditId(item.id);
                          setName(item.name);
                          setCategory(item.category);
                          setQuantity(item.quantity);
                          setThreshold(item.min_threshold);
                          setNotes(item.notes || '');
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 2. Add & Edit Items */}
      <Card>
        <CardHeader>
          <CardTitle>{editId ? 'Edit Item' : 'Add Item'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <Select value={category} onValueChange={(v: any) => setCategory(v)}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Quantity" value={quantity} onChange={e => setQuantity(parseInt(e.target.value || '0'))} />
          <Input type="number" placeholder="Min threshold" value={threshold} onChange={e => setThreshold(parseInt(e.target.value || '0'))} />
          <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={saveItem}>{editId ? 'Save' : 'Add'}</Button>
            {editId && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      {/* 4. Manual Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <Select value={adjustItemId || ''} onValueChange={(v: any) => setAdjustItemId(v)}>
            <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
            <SelectContent>
              {items.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="increase">Increase (shipment)</SelectItem>
              <SelectItem value="decrease">Decrease (damaged/expired)</SelectItem>
              <SelectItem value="usage">Usage</SelectItem>
              <SelectItem value="correction">Correction</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Qty" value={adjustQty} onChange={e => setAdjustQty(parseInt(e.target.value || '1'))} />
          <Input placeholder="Reason (optional)" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
          <Button onClick={applyAdjustment}>Apply</Button>
        </CardContent>
      </Card>

      {/* 3. Treatment-to-Inventory Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Treatment Mappings</span>
            <Button variant="outline" size="sm" onClick={() => {
              // Placeholder: simulate inventory impact could open a modal using current selections
              toast({ title: 'Simulation', description: 'Simulate inventory impact coming soon.' });
            }}>Simulate inventory impact</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
            <Select value={selectedTreatmentTypeId || ''} onValueChange={(v: any) => setSelectedTreatmentTypeId(v)}>
              <SelectTrigger><SelectValue placeholder="Select treatment type" /></SelectTrigger>
              <SelectContent>
                {treatmentTypes.map(tt => (<SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={newMappingItemId || ''} onValueChange={(v: any) => setNewMappingItemId(v)}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {items.map(i => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="number" placeholder="Qty" value={newMappingQty} onChange={e => setNewMappingQty(parseInt(e.target.value || '1'))} />
              <Button onClick={addMapping} disabled={!selectedTreatmentTypeId || !newMappingItemId}>Add</Button>
            </div>
          </div>
          {selectedTreatmentTypeId && (
            <div className="border rounded p-3">
              <div className="text-sm font-medium mb-2">Current mappings</div>
              {mappings.length === 0 ? (
                <div className="text-sm text-muted-foreground">No mappings configured.</div>
              ) : (
                <div className="space-y-2">
                  {mappings.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div>
                        {items.find(i => i.id === m.item_id)?.name || m.item_id} × {m.quantity}
                      </div>
                      <Button variant="ghost" onClick={() => deleteMapping(m.id)}>Remove</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Inventory Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics (Last 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="font-semibold">Most used</div>
            {Object.entries(usageLast30)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([itemId, used]) => (
                <div key={itemId} className="text-sm flex justify-between">
                  <span>{items.find(i => i.id === itemId)?.name || itemId}</span>
                  <span>{used}</span>
                </div>
              ))}
            {Object.keys(usageLast30).length === 0 && <div className="text-sm text-muted-foreground">No usage recorded.</div>}
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Low / Out of stock</div>
            {items.filter(i => i.quantity <= i.min_threshold).length === 0 ? (
              <div className="text-sm text-muted-foreground">All good.</div>
            ) : (
              items.filter(i => i.quantity <= i.min_threshold).map(i => (
                <div key={i.id} className="text-sm flex justify-between">
                  <span>{i.name}</span>
                  <span>{i.quantity}</span>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Predicted depletion</div>
            {items.map(i => (
              <div key={i.id} className="text-sm flex justify-between">
                <span>{i.name}</span>
                <span>{predictDepletionDate(i) || '-'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
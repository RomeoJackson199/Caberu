import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Plus, Trash2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhoneNumber {
  id: string;
  phone_number: string;
  label: string | null;
  is_active: boolean;
}

interface PhoneSetupCardProps {
  businessId: string;
}

export function PhoneSetupCard({ businessId }: PhoneSetupCardProps) {
  const { toast } = useToast();
  const [phones, setPhones] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("Main Line");

  useEffect(() => {
    if (!businessId) return;
    fetchPhones();
  }, [businessId]);

  const fetchPhones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_phone_numbers')
      .select('id, phone_number, label, is_active')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) console.error('Failed to load phone numbers:', error);
    setPhones(data || []);
    setLoading(false);
  };

  const addPhone = async () => {
    if (!newNumber.trim()) return;
    const { error } = await supabase.from('business_phone_numbers').insert({
      business_id: businessId,
      phone_number: newNumber.trim(),
      label: newLabel.trim() || 'Main Line',
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Phone number added" });
    setNewNumber("");
    setNewLabel("Main Line");
    setAdding(false);
    fetchPhones();
  };

  const removePhone = async (id: string) => {
    const { error } = await supabase.from('business_phone_numbers').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Phone number removed" });
    fetchPhones();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4" />
          Phone Number Setup
        </CardTitle>
        <CardDescription>
          Your Twilio number(s) that forward calls to the AI receptionist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Numbers */}
        {loading ? (
          <div className="animate-pulse h-10 bg-muted rounded" />
        ) : phones.length > 0 ? (
          <div className="space-y-2">
            {phones.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={p.is_active ? "default" : "secondary"}>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <div>
                    <p className="text-sm font-mono font-medium">{p.phone_number}</p>
                    <p className="text-xs text-muted-foreground">{p.label || "Main Line"}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removePhone(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No phone numbers configured yet
          </div>
        )}

        {/* Add Number */}
        {adding ? (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Twilio Number</Label>
              <Input
                placeholder="+1 234 567 8900"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input
                placeholder="Main Line"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addPhone}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Phone Number
          </Button>
        )}

        {/* Call Forwarding Instructions */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-primary" />
            How to set up call forwarding
          </div>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Purchase a Twilio number or use your existing one</li>
            <li>Add the Twilio number above so we can identify your clinic</li>
            <li>On your clinic phone, set up <strong>call forwarding</strong> to your Twilio number</li>
            <li>When patients call your clinic number, the AI receptionist will answer</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>Tip:</strong> Most phone providers allow conditional forwarding (e.g., forward when busy or unanswered) so the AI only picks up when you can't.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneVerificationDialog } from "@/components/auth/PhoneVerificationDialog";
import { DemoAppointments } from "@/components/demo/DemoAppointments";
import { UndoDemo } from "@/components/demo/UndoDemo";
import { Calendar, Phone, Undo2 } from "lucide-react";

export default function DemoShowcase() {
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Feature Demos</h1>
            <Badge variant="secondary">Interactive</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Try out the core Caberu features below — no account needed.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="appointments">
          <TabsList className="mb-6">
            <TabsTrigger value="appointments" className="gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-2">
              <Phone className="h-4 w-4" />
              Phone Verification
            </TabsTrigger>
            <TabsTrigger value="undo" className="gap-2">
              <Undo2 className="h-4 w-4" />
              Undo Actions
            </TabsTrigger>
          </TabsList>

          {/* Appointment Calendar */}
          <TabsContent value="appointments">
            <DemoAppointments />
          </TabsContent>

          {/* Phone Verification */}
          <TabsContent value="phone">
            <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
              <div className="p-4 rounded-full bg-primary/10">
                <Phone className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">SMS Phone Verification</h2>
              <p className="text-muted-foreground max-w-sm">
                Verify a phone number via SMS code — the same flow patients go through during signup.
              </p>

              {verifiedPhone ? (
                <div className="p-4 bg-green-100 text-green-800 rounded-lg font-medium">
                  Verified: {verifiedPhone}
                </div>
              ) : null}

              <Button size="lg" onClick={() => setPhoneOpen(true)}>
                Try Phone Verification
              </Button>

              <PhoneVerificationDialog
                open={phoneOpen}
                onOpenChange={setPhoneOpen}
                onSuccess={(phone) => {
                  setVerifiedPhone(phone);
                  setPhoneOpen(false);
                }}
              />
            </div>
          </TabsContent>

          {/* Undo Actions */}
          <TabsContent value="undo">
            <UndoDemo />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

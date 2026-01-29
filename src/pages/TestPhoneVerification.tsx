import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneVerificationDialog } from "@/components/auth/PhoneVerificationDialog";

export default function TestPhoneVerification() {
  const [open, setOpen] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">Phone Verification Test</h1>

        {verifiedPhone ? (
          <div className="p-4 bg-green-100 text-green-800 rounded-lg">
            Verified: {verifiedPhone}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Click the button below to test SMS verification
          </p>
        )}

        <Button onClick={() => setOpen(true)} size="lg">
          Verify Phone Number
        </Button>

        <PhoneVerificationDialog
          open={open}
          onOpenChange={setOpen}
          onSuccess={(phone) => {
            setVerifiedPhone(phone);
          }}
        />
      </div>
    </div>
  );
}

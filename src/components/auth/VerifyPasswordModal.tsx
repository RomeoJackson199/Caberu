import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VerifyPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
    action: "export" | "delete";
}

export function VerifyPasswordModal({
    isOpen,
    onClose,
    onVerified,
    action,
}: VerifyPasswordModalProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) {
                throw new Error("User not found");
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password,
            });

            if (signInError) {
                throw new Error("Incorrect password");
            }

            onVerified();
            onClose();
            setPassword("");
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Verify Identity</DialogTitle>
                    <DialogDescription>
                        Please enter your password to confirm {action === "export" ? "data export" : "account deletion"}.
                        {action === "delete" && " This action cannot be undone."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleVerify} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant={action === "delete" ? "destructive" : "default"}
                            disabled={loading || !password}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {action === "delete" ? "Delete Account" : "Confirm Export"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

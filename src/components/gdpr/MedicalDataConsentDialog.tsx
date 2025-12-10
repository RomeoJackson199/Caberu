import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, FileText, Lock, AlertCircle } from 'lucide-react';

interface MedicalDataConsentDialogProps {
    userId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConsentGranted: () => void;
}

/**
 * GDPR Article 9 Compliant Medical Data Consent Dialog
 * Required before accessing special category health data
 */
export const MedicalDataConsentDialog = ({
    userId,
    open,
    onOpenChange,
    onConsentGranted
}: MedicalDataConsentDialogProps) => {
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGrantConsent = async () => {
        if (!agreed) {
            toast({
                title: "Agreement Required",
                description: "Please read and agree to the consent terms.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            // Calculate expiry date (1 year from now)
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            // Insert consent record
            const { error } = await supabase.from('gdpr_consents').insert({
                user_id: userId,
                consent_type: 'medical_data_access',
                status: 'granted',
                granted_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                version: '1.0',
                consent_text: 'I consent to the processing of my medical and health data for the purpose of dental treatment and care under GDPR Article 9(2)(a).',
                user_agent: navigator.userAgent
            });

            if (error) throw error;

            // Log consent in audit trail
            await supabase.from('audit_logs').insert({
                user_id: userId,
                action: 'GDPR_CONSENT_GRANTED',
                target_table: 'gdpr_consents',
                metadata: {
                    consent_type: 'medical_data_access',
                    expires_at: expiresAt.toISOString(),
                    gdpr_article: '9(2)(a)'
                },
                created_at: new Date().toISOString()
            }).catch(() => { }); // Don't fail if audit log fails

            toast({
                title: "Consent Granted",
                description: "You can now access your medical records.",
            });

            onConsentGranted();
            onOpenChange(false);
        } catch (error) {
            console.error('Consent error:', error);
            toast({
                title: "Error",
                description: "Failed to save consent. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDecline = () => {
        toast({
            title: "Access Restricted",
            description: "Medical data access requires your consent. You can grant consent later in Settings.",
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <DialogTitle>Medical Data Access Consent</DialogTitle>
                    </div>
                    <DialogDescription>
                        Your health data is protected under GDPR Article 9 (special category data).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Info Alert */}
                    <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            Under EU law, we need your explicit consent to process medical and health information.
                        </div>
                    </div>

                    {/* What We Collect */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium">
                            <FileText className="h-4 w-4" />
                            <span>Data We Process</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                            <li>Medical history and conditions</li>
                            <li>Prescriptions and medications</li>
                            <li>Treatment plans and records</li>
                            <li>Dental examination notes</li>
                        </ul>
                    </div>

                    {/* How We Use It */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium">
                            <Lock className="h-4 w-4" />
                            <span>Purpose of Processing</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                            <li>Provide appropriate dental care</li>
                            <li>Maintain legally required medical records</li>
                            <li>Communicate about your treatment</li>
                        </ul>
                    </div>

                    {/* Your Rights */}
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                        <p className="font-medium">Your Rights:</p>
                        <ul className="text-muted-foreground space-y-1 list-disc ml-4">
                            <li>Withdraw consent at any time</li>
                            <li>Request a copy of your data (portability)</li>
                            <li>Request correction or deletion</li>
                        </ul>
                    </div>

                    {/* Expiry Notice */}
                    <p className="text-xs text-muted-foreground">
                        This consent is valid for 1 year and expires on{' '}
                        {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}.
                    </p>

                    {/* Consent Checkbox */}
                    <div className="flex items-start space-x-3 pt-4 border-t">
                        <Checkbox
                            id="medical-consent"
                            checked={agreed}
                            onCheckedChange={(checked) => setAgreed(checked as boolean)}
                            disabled={isLoading}
                        />
                        <label
                            htmlFor="medical-consent"
                            className="text-sm font-medium leading-tight cursor-pointer"
                        >
                            I have read and consent to the processing of my medical data as described above
                        </label>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={handleDecline}
                        disabled={isLoading}
                    >
                        Decline
                    </Button>
                    <Button
                        onClick={handleGrantConsent}
                        disabled={!agreed || isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Grant Consent'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

/**
 * Check if user has valid medical data consent
 */
export const checkMedicalDataConsent = async (userId: string): Promise<boolean> => {
    try {
        const { data: consent, error } = await supabase
            .from('gdpr_consents')
            .select('*')
            .eq('user_id', userId)
            .eq('consent_type', 'medical_data_access')
            .eq('status', 'granted')
            .order('granted_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !consent) {
            return false;
        }

        // Check if consent is expired
        if (consent.expires_at) {
            const expiryDate = new Date(consent.expires_at);
            if (expiryDate < new Date()) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Consent check error:', error);
        return false;
    }
};

export default MedicalDataConsentDialog;

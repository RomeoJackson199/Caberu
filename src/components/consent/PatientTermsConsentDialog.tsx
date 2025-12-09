import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface PatientTermsConsentData {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    dataProcessingConsent: boolean;
    timestamp: string;
}

interface PatientTermsConsentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAccept: (consentData: PatientTermsConsentData) => void;
}

/**
 * GDPR Terms Consent Dialog for Patients (shown during signup)
 * Collects consent for terms, privacy policy, and general data processing
 */
export const PatientTermsConsentDialog = ({
    open,
    onOpenChange,
    onAccept,
}: PatientTermsConsentDialogProps) => {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [dataProcessingConsent, setDataProcessingConsent] = useState(false);

    const allChecked = termsAccepted && privacyAccepted && dataProcessingConsent;

    const handleAccept = () => {
        if (!allChecked) return;

        onAccept({
            termsAccepted,
            privacyAccepted,
            dataProcessingConsent,
            timestamp: new Date().toISOString(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Shield className="h-6 w-6 text-blue-600" />
                        Terms & Privacy Agreement
                    </DialogTitle>
                    <DialogDescription>
                        Please review and accept the following to create your account.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Info Box */}
                    <Card className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">
                                Caberu helps you manage your dental appointments and health records.
                                Your data is stored securely and processed according to GDPR regulations.
                            </p>
                        </div>
                    </Card>

                    {/* Consent Checkboxes */}
                    <div className="space-y-4">
                        {/* Terms of Service */}
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="termsAccepted"
                                checked={termsAccepted}
                                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="termsAccepted" className="text-sm leading-relaxed cursor-pointer">
                                I have read and accept the{" "}
                                <Link to="/terms" className="text-blue-600 hover:underline" target="_blank">Terms of Service</Link>.
                            </Label>
                        </div>

                        {/* Privacy Policy */}
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="privacyAccepted"
                                checked={privacyAccepted}
                                onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="privacyAccepted" className="text-sm leading-relaxed cursor-pointer">
                                I have read and accept the{" "}
                                <Link to="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</Link>.
                            </Label>
                        </div>

                        {/* Data Processing Consent */}
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="dataProcessingConsent"
                                checked={dataProcessingConsent}
                                onCheckedChange={(checked) => setDataProcessingConsent(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="dataProcessingConsent" className="text-sm leading-relaxed cursor-pointer">
                                I consent to the processing of my personal data (name, email, contact information)
                                to provide the service. I understand I can withdraw consent at any time.
                            </Label>
                        </div>
                    </div>

                    {/* GDPR Notice */}
                    <p className="text-xs text-gray-500">
                        Your data rights under GDPR: access, rectification, erasure, portability, and withdrawal of consent.
                        Contact Romeo@caberu.be for data requests.
                    </p>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAccept}
                        disabled={!allChecked}
                        className="w-full sm:w-auto"
                    >
                        I Accept & Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PatientTermsConsentDialog;

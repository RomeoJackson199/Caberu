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
import { Shield, FileText, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface ConsentData {
    generalConsent: boolean;
    dataProcessingConsent: boolean;
    termsAccepted: boolean;
    timestamp: string;
}

interface DentalPracticeConsentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAccept: (consentData: ConsentData) => void;
}

/**
 * GDPR Consent Dialog for Dental Practices (shown during signup)
 * Collects consent for data processing and terms acceptance
 */
export const DentalPracticeConsentDialog = ({
    open,
    onOpenChange,
    onAccept,
}: DentalPracticeConsentDialogProps) => {
    const [generalConsent, setGeneralConsent] = useState(false);
    const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const allChecked = generalConsent && dataProcessingConsent && termsAccepted;

    const handleAccept = () => {
        if (!allChecked) return;

        onAccept({
            generalConsent,
            dataProcessingConsent,
            termsAccepted,
            timestamp: new Date().toISOString(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Shield className="h-6 w-6 text-blue-600" />
                        GDPR Consent & Terms Agreement
                    </DialogTitle>
                    <DialogDescription>
                        Please review and accept the following before creating your account.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Data Controller Notice */}
                    <Card className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-700">
                                <p className="font-semibold mb-1">Important Information</p>
                                <p>
                                    As a dental practice using Caberu, <strong>you are the Data Controller</strong> for your patients' health data.
                                    Caberu acts as your <strong>Data Processor</strong> under GDPR Article 28.
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Consent Checkboxes */}
                    <div className="space-y-4">
                        {/* General Consent */}
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="generalConsent"
                                checked={generalConsent}
                                onCheckedChange={(checked) => setGeneralConsent(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="generalConsent" className="text-sm leading-relaxed cursor-pointer">
                                I understand that Caberu will process my dental practice's business information (practice name, contact details, billing information) as a <strong>Data Controller</strong> to provide the Service.
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
                                I acknowledge that when I add patient health data, I am the <strong>Data Controller</strong> and must obtain patient consent.
                                I agree that Caberu will process this data on my behalf as per the{" "}
                                <Link to="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</Link>.
                            </Label>
                        </div>

                        {/* Terms Acceptance */}
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="termsAccepted"
                                checked={termsAccepted}
                                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="termsAccepted" className="text-sm leading-relaxed cursor-pointer">
                                I have read and accept the{" "}
                                <Link to="/terms" className="text-blue-600 hover:underline" target="_blank">Terms of Service</Link>{" "}
                                and{" "}
                                <Link to="/privacy" className="text-blue-600 hover:underline" target="_blank">Privacy Policy</Link>.
                            </Label>
                        </div>
                    </div>

                    {/* Warning */}
                    <Card className="p-4 bg-orange-50 border-orange-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">
                                <strong>Your responsibility:</strong> You must obtain explicit consent from your patients before entering their health data into Caberu.
                                You can use our patient consent form for this purpose.
                            </p>
                        </div>
                    </Card>
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

// ------------------------------------------------------------------
// Patient Health Data Consent Dialog
// ------------------------------------------------------------------

interface PatientConsentData {
    healthDataConsent: boolean;
    dataProcessingConsent: boolean;
    understandRights: boolean;
    consentDate: string;
}

interface PatientHealthDataConsentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dentalPracticeName: string;
    onAccept: (consentData: PatientConsentData) => void;
}

/**
 * GDPR Consent Dialog for Patients
 * Collects explicit consent for health data processing (Article 9)
 */
export const PatientHealthDataConsentDialog = ({
    open,
    onOpenChange,
    dentalPracticeName,
    onAccept,
}: PatientHealthDataConsentDialogProps) => {
    const [healthDataConsent, setHealthDataConsent] = useState(false);
    const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
    const [understandRights, setUnderstandRights] = useState(false);

    const allChecked = healthDataConsent && dataProcessingConsent && understandRights;

    const handleAccept = () => {
        if (!allChecked) return;

        onAccept({
            healthDataConsent,
            dataProcessingConsent,
            understandRights,
            consentDate: new Date().toISOString(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Shield className="h-6 w-6 text-green-600" />
                        Health Data Consent
                    </DialogTitle>
                    <DialogDescription>
                        <strong>{dentalPracticeName}</strong> uses Caberu to manage patient records. Please review and consent to the processing of your health data.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Information Box */}
                    <Card className="p-4 bg-green-50 border-green-200">
                        <p className="text-sm text-gray-700">
                            <strong>Your Data Controller:</strong> {dentalPracticeName} is responsible for your data.
                            Caberu is the technology platform that securely stores and processes data on their behalf.
                        </p>
                    </Card>

                    {/* What data is collected */}
                    <div>
                        <h4 className="font-semibold text-sm mb-2">What health data may be collected:</h4>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                            <li>Dental medical history and conditions</li>
                            <li>Treatment records and diagnoses</li>
                            <li>Prescriptions and medications</li>
                            <li>Appointment history</li>
                            <li>Clinical notes and X-rays</li>
                        </ul>
                    </div>

                    {/* Consent Checkboxes */}
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="healthDataConsent"
                                checked={healthDataConsent}
                                onCheckedChange={(checked) => setHealthDataConsent(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="healthDataConsent" className="text-sm leading-relaxed cursor-pointer">
                                I <strong>explicitly consent</strong> to the collection and processing of my health data (special category data under GDPR Article 9) by {dentalPracticeName} for healthcare purposes.
                            </Label>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="dataProcessingConsent"
                                checked={dataProcessingConsent}
                                onCheckedChange={(checked) => setDataProcessingConsent(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="dataProcessingConsent" className="text-sm leading-relaxed cursor-pointer">
                                I consent to my data being stored securely in the Caberu platform, which processes data on behalf of {dentalPracticeName}.
                            </Label>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="understandRights"
                                checked={understandRights}
                                onCheckedChange={(checked) => setUnderstandRights(checked === true)}
                                className="mt-1"
                            />
                            <Label htmlFor="understandRights" className="text-sm leading-relaxed cursor-pointer">
                                I understand my rights under GDPR including the right to access, rectify, erase, and port my data.
                                I can withdraw consent at any time by contacting {dentalPracticeName}.
                            </Label>
                        </div>
                    </div>

                    {/* Withdrawal notice */}
                    <p className="text-xs text-gray-500">
                        You can withdraw this consent at any time. Contact your dental practice to exercise your data rights.
                    </p>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Decline
                    </Button>
                    <Button
                        onClick={handleAccept}
                        disabled={!allChecked}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                    >
                        I Consent
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

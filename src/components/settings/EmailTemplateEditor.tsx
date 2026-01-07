import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Mail, Eye, Save, RotateCcw, Loader2, Code, Send } from "lucide-react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Template types with their available variables
const TEMPLATE_TYPES = {
    appointment_confirmation: {
        label: "Appointment Confirmation",
        description: "Sent when a new appointment is booked",
        variables: ["patient_name", "appointment_date", "appointment_time", "dentist_name", "clinic_name", "clinic_address", "clinic_phone"],
        defaultSubject: "Appointment Confirmed - {{clinic_name}}",
        defaultBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Appointment Confirmed</h2>
  <p>Hi {{patient_name}},</p>
  <p>Your appointment has been confirmed!</p>
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Date:</strong> {{appointment_date}}</p>
    <p><strong>Time:</strong> {{appointment_time}}</p>
    <p><strong>Dentist:</strong> {{dentist_name}}</p>
    <p><strong>Location:</strong> {{clinic_address}}</p>
  </div>
  <p>Please arrive 10 minutes early. If you need to reschedule, contact us at {{clinic_phone}}.</p>
  <p>Best regards,<br>{{clinic_name}}</p>
</div>`
    },
    appointment_reminder: {
        label: "Appointment Reminder",
        description: "Sent 24h/2h before appointment",
        variables: ["patient_name", "appointment_date", "appointment_time", "dentist_name", "clinic_name", "clinic_address", "clinic_phone", "reminder_type"],
        defaultSubject: "Reminder: Your Appointment Tomorrow - {{clinic_name}}",
        defaultBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Appointment Reminder</h2>
  <p>Hi {{patient_name}},</p>
  <p>This is a friendly reminder about your upcoming appointment.</p>
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Date:</strong> {{appointment_date}}</p>
    <p><strong>Time:</strong> {{appointment_time}}</p>
    <p><strong>Dentist:</strong> {{dentist_name}}</p>
    <p><strong>Location:</strong> {{clinic_address}}</p>
  </div>
  <p>See you soon!</p>
  <p>{{clinic_name}}</p>
</div>`
    },
    appointment_cancelled: {
        label: "Appointment Cancelled",
        description: "Sent when an appointment is cancelled",
        variables: ["patient_name", "appointment_date", "appointment_time", "dentist_name", "clinic_name", "clinic_phone"],
        defaultSubject: "Appointment Cancelled - {{clinic_name}}",
        defaultBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">Appointment Cancelled</h2>
  <p>Hi {{patient_name}},</p>
  <p>Your appointment scheduled for {{appointment_date}} at {{appointment_time}} has been cancelled.</p>
  <p>To book a new appointment, please contact us at {{clinic_phone}} or visit our website.</p>
  <p>Best regards,<br>{{clinic_name}}</p>
</div>`
    },
    payment_received: {
        label: "Payment Received",
        description: "Sent when payment is received",
        variables: ["patient_name", "amount", "invoice_number", "payment_date", "clinic_name"],
        defaultSubject: "Payment Received - Thank You! - {{clinic_name}}",
        defaultBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #16a34a;">Payment Received</h2>
  <p>Hi {{patient_name}},</p>
  <p>Thank you for your payment!</p>
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Amount:</strong> {{amount}}</p>
    <p><strong>Invoice:</strong> {{invoice_number}}</p>
    <p><strong>Date:</strong> {{payment_date}}</p>
  </div>
  <p>Thank you for choosing {{clinic_name}}!</p>
</div>`
    },
    payment_reminder: {
        label: "Payment Reminder",
        description: "Sent to remind about outstanding payments",
        variables: ["patient_name", "amount", "invoice_number", "due_date", "payment_link", "clinic_name", "clinic_phone"],
        defaultSubject: "Payment Reminder - {{clinic_name}}",
        defaultBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f59e0b;">Payment Reminder</h2>
  <p>Hi {{patient_name}},</p>
  <p>This is a friendly reminder about your outstanding balance.</p>
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Amount Due:</strong> {{amount}}</p>
    <p><strong>Invoice:</strong> {{invoice_number}}</p>
    <p><strong>Due Date:</strong> {{due_date}}</p>
  </div>
  <p><a href="{{payment_link}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Pay Now</a></p>
  <p>Questions? Contact us at {{clinic_phone}}.</p>
  <p>Thank you,<br>{{clinic_name}}</p>
</div>`
    }
};

type TemplateType = keyof typeof TEMPLATE_TYPES;

interface EmailTemplate {
    id?: string;
    business_id: string;
    template_type: string;
    subject: string;
    body_html: string;
    is_active: boolean;
}

export function EmailTemplateEditor() {
    const { businessId } = useBusinessContext();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedType, setSelectedType] = useState<TemplateType>("appointment_confirmation");
    const [subject, setSubject] = useState("");
    const [bodyHtml, setBodyHtml] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);

    // Send test email to dentist
    const sendTestEmail = async () => {
        setSendingTest(true);
        try {
            // Get current user's email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                throw new Error("No email found for current user");
            }

            // Get preview HTML with sample data
            const previewHtml = getPreviewHtml();
            const previewSubject = subject
                .replace(/{{clinic_name}}/g, 'Your Clinic')
                .replace(/{{patient_name}}/g, 'Test User');

            // Send via edge function
            const { error } = await supabase.functions.invoke('send-email-notification', {
                body: {
                    to: user.email,
                    subject: `[TEST] ${previewSubject}`,
                    message: previewHtml,
                    messageType: 'system',
                    isSystemNotification: true,
                },
            });

            if (error) throw error;

            toast({
                title: "Test Email Sent!",
                description: `Check your inbox at ${user.email}`,
            });
        } catch (error: any) {
            toast({
                title: "Failed to send test email",
                description: error.message || "Unknown error",
                variant: "destructive",
            });
        } finally {
            setSendingTest(false);
        }
    };

    // Fetch existing templates
    const { data: templates, isLoading } = useQuery({
        queryKey: ["email-templates", businessId],
        queryFn: async () => {
            if (!businessId) return [];
            const { data, error } = await supabase
                .from("business_email_templates")
                .select("*")
                .eq("business_id", businessId);
            if (error) throw error;
            return data as EmailTemplate[];
        },
        enabled: !!businessId,
    });

    // Load template when type changes
    useEffect(() => {
        const existingTemplate = templates?.find(t => t.template_type === selectedType);
        if (existingTemplate) {
            setSubject(existingTemplate.subject);
            setBodyHtml(existingTemplate.body_html);
            setIsActive(existingTemplate.is_active);
        } else {
            // Load defaults
            const defaults = TEMPLATE_TYPES[selectedType];
            setSubject(defaults.defaultSubject);
            setBodyHtml(defaults.defaultBody);
            setIsActive(true);
        }
    }, [selectedType, templates]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!businessId) throw new Error("No business selected");

            const existingTemplate = templates?.find(t => t.template_type === selectedType);

            if (existingTemplate) {
                const { error } = await supabase
                    .from("business_email_templates")
                    .update({
                        subject,
                        body_html: bodyHtml,
                        is_active: isActive,
                    })
                    .eq("id", existingTemplate.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("business_email_templates")
                    .insert({
                        business_id: businessId,
                        template_type: selectedType,
                        subject,
                        body_html: bodyHtml,
                        is_active: isActive,
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["email-templates", businessId] });
            toast({
                title: "Template Saved",
                description: "Your email template has been saved successfully.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to save template",
                variant: "destructive",
            });
        },
    });

    const resetToDefault = () => {
        const defaults = TEMPLATE_TYPES[selectedType];
        setSubject(defaults.defaultSubject);
        setBodyHtml(defaults.defaultBody);
    };

    const insertVariable = (variable: string) => {
        setBodyHtml(prev => prev + `{{${variable}}}`);
    };

    // Generate preview HTML with sample data
    // SECURITY: Sanitize HTML to prevent XSS attacks
    const getPreviewHtml = () => {
        let preview = bodyHtml;
        const sampleData: Record<string, string> = {
            patient_name: "John Smith",
            appointment_date: "December 10, 2025",
            appointment_time: "2:30 PM",
            dentist_name: "Dr. Sarah Johnson",
            clinic_name: "Bright Smile Dental",
            clinic_address: "123 Main Street, Brussels",
            clinic_phone: "+32 2 123 4567",
            reminder_type: "24 hours",
            amount: "€150.00",
            invoice_number: "INV-2025-001",
            payment_date: "December 5, 2025",
            due_date: "December 15, 2025",
            payment_link: "#",
        };

        Object.entries(sampleData).forEach(([key, value]) => {
            preview = preview.replace(new RegExp(`{{${key}}}`, "g"), value);
        });

        // Sanitize HTML to prevent XSS - allow email-safe tags only
        // SECURITY: Removed 'style' attribute to prevent CSS injection attacks
        // Validate href URLs to only allow safe protocols (https, mailto)
        const sanitized = DOMPurify.sanitize(preview, {
            ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                          'strong', 'b', 'em', 'i', 'u', 'a', 'br', 'hr',
                          'table', 'thead', 'tbody', 'tr', 'th', 'td',
                          'ul', 'ol', 'li', 'img'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel',
                          'width', 'height', 'border', 'cellpadding', 'cellspacing'],
            ALLOW_DATA_ATTR: false,
            // Hook to validate href attributes - only allow safe protocols
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        });
        
        return sanitized;
    };

    const currentTemplate = TEMPLATE_TYPES[selectedType];
    const hasCustomTemplate = templates?.some(t => t.template_type === selectedType);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Templates
                </CardTitle>
                <CardDescription>
                    Customize the emails sent to your patients
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Template Type Selector */}
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(TEMPLATE_TYPES) as TemplateType[]).map((type) => {
                        const isCustomized = templates?.some(t => t.template_type === type);
                        return (
                            <Button
                                key={type}
                                variant={selectedType === type ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedType(type)}
                                className="relative"
                            >
                                {TEMPLATE_TYPES[type].label}
                                {isCustomized && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                        Custom
                                    </Badge>
                                )}
                            </Button>
                        );
                    })}
                </div>

                <p className="text-sm text-muted-foreground">
                    {currentTemplate.description}
                </p>

                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <Label>Template Active</Label>
                        <p className="text-sm text-muted-foreground">
                            When disabled, the default template will be used
                        </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                {/* Subject Line */}
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Email subject..."
                    />
                </div>

                {/* Variable Buttons */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Insert Variable
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {currentTemplate.variables.map((variable) => (
                            <Button
                                key={variable}
                                variant="outline"
                                size="sm"
                                onClick={() => insertVariable(variable)}
                            >
                                {`{{${variable}}}`}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Body Editor / Preview */}
                <Tabs defaultValue="edit" className="w-full">
                    <TabsList>
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Preview
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit" className="mt-4">
                        <Textarea
                            value={bodyHtml}
                            onChange={(e) => setBodyHtml(e.target.value)}
                            placeholder="Email body HTML..."
                            className="min-h-[400px] font-mono text-sm"
                        />
                    </TabsContent>
                    <TabsContent value="preview" className="mt-4">
                        <div
                            className="border rounded-lg p-4 bg-white min-h-[400px]"
                            dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                        />
                    </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" onClick={resetToDefault}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Default
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={sendTestEmail} disabled={sendingTest}>
                            {sendingTest ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Send Test Email
                        </Button>
                        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Template
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

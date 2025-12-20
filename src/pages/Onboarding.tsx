import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Calendar, ArrowRight, MapPin, Shield, Sparkles, Heart, Bell } from "lucide-react";
import { validateName } from "@/lib/security";
import { PhoneNumberInput } from "@/components/ui/phone-input";

const Onboarding = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phone: "",
        address: "",
        postalCode: "",
        city: "",
        enable2FA: false,
    });

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate("/login");
                return;
            }

            // Check if profile is already complete
            const { data: profile } = await supabase
                .from("profiles")
                .select("first_name, last_name, date_of_birth, phone, address")
                .eq("user_id", user.id)
                .single();

            if (profile?.first_name && profile?.last_name && profile?.date_of_birth) {
                navigate("/dashboard");
            }

            // Pre-fill form if some data exists
            if (profile) {
                setFormData(prev => ({
                    ...prev,
                    firstName: profile.first_name || "",
                    lastName: profile.last_name || "",
                    dateOfBirth: profile.date_of_birth || "",
                    phone: profile.phone || "",
                    address: profile.address || "",
                }));
            }
        } catch (error) {
            console.error("Error checking user:", error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Validation
            if (!validateName(formData.firstName)) {
                throw new Error("First name contains invalid characters");
            }
            if (!validateName(formData.lastName)) {
                throw new Error("Last name contains invalid characters");
            }
            if (!formData.phone) {
                throw new Error("Phone number is required");
            }
            if (!formData.dateOfBirth) {
                throw new Error("Date of birth is required");
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // Combine address fields
            const fullAddress = formData.address
                ? `${formData.address}, ${formData.postalCode} ${formData.city}`.trim()
                : "";

            const { error } = await supabase
                .from("profiles")
                .update({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    date_of_birth: formData.dateOfBirth,
                    phone: formData.phone,
                    address: fullAddress,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);

            if (error) throw error;

            toast({
                title: "Welcome to Caberu! 🎉",
                description: "Your profile is complete. Let's book your first appointment!",
            });

            navigate("/dashboard");
        } catch (error: unknown) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
                <div className="w-full max-w-lg space-y-6">
                    {/* Header skeleton */}
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-muted animate-pulse rounded-2xl" />
                        <div className="space-y-2">
                            <div className="h-8 w-64 mx-auto bg-muted animate-pulse rounded" />
                            <div className="h-4 w-80 mx-auto bg-muted animate-pulse rounded" />
                        </div>
                    </div>
                    {/* Features skeleton */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-3 bg-white/80 rounded-lg border">
                                <div className="h-5 w-5 mx-auto bg-muted animate-pulse rounded mb-2" />
                                <div className="h-3 w-16 mx-auto bg-muted animate-pulse rounded" />
                            </div>
                        ))}
                    </div>
                    {/* Form skeleton */}
                    <div className="bg-white border rounded-xl p-6 shadow-lg space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                                </div>
                            ))}
                        </div>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                <div className="h-10 w-full bg-muted animate-pulse rounded" />
                            </div>
                        ))}
                        <div className="h-12 w-full bg-muted animate-pulse rounded" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-lg space-y-6">
                {/* Welcome Header */}
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Welcome to Caberu!</h1>
                        <p className="text-muted-foreground mt-2">
                            Let's set up your profile so you can start booking appointments.
                        </p>
                    </div>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-white/80 rounded-lg text-center border shadow-sm">
                        <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">Easy Booking</p>
                    </div>
                    <div className="p-3 bg-white/80 rounded-lg text-center border shadow-sm">
                        <Bell className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs font-medium">Reminders</p>
                    </div>
                    <div className="p-3 bg-white/80 rounded-lg text-center border shadow-sm">
                        <Heart className="h-5 w-5 text-red-500 mx-auto mb-1" />
                        <p className="text-xs font-medium">Health Records</p>
                    </div>
                </div>

                <div className="bg-white border rounded-xl p-6 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name *</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="pl-10"
                                        placeholder="Jan"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Peeters"
                                    required
                                />
                            </div>
                        </div>

                        {/* Date of Birth */}
                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="dateOfBirth"
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    className="pl-10"
                                    required
                                    max={new Date().toISOString().split("T")[0]}
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <PhoneNumberInput
                                value={formData.phone}
                                onChange={(val) => setFormData({ ...formData, phone: val || "" })}
                                placeholder="Enter phone number"
                            />
                        </div>

                        {/* Address */}
                        <div className="space-y-2">
                            <Label htmlFor="address">Address (Optional)</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="pl-10"
                                    placeholder="Street and number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="postalCode">Postal Code</Label>
                                <Input
                                    id="postalCode"
                                    value={formData.postalCode}
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                    placeholder="1000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Brussels"
                                />
                            </div>
                        </div>

                        {/* 2FA Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-blue-50/50">
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-blue-600" />
                                    <Label className="font-medium cursor-pointer">Enable Two-Factor Authentication</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Add extra security to your account
                                </p>
                            </div>
                            <Switch
                                checked={formData.enable2FA}
                                onCheckedChange={(checked) => setFormData({ ...formData, enable2FA: checked })}
                            />
                        </div>

                        <Button type="submit" className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Complete Profile
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Your data is secure and GDPR compliant
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;


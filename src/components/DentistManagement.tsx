import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus, Mail, User, Edit, Eye, Search, Power, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { logger } from '@/lib/logger';
import { useLanguage } from '@/hooks/useLanguage';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

interface DentistManagementProps {
  currentDentistId: string;
}

export const DentistManagement = ({ currentDentistId }: DentistManagementProps) => {
  const [newDentistEmail, setNewDentistEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [dentists, setDentists] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDentist, setSelectedDentist] = useState<any>(null);
  const [editingDentist, setEditingDentist] = useState<any>(null);
  const [selectedDentists, setSelectedDentists] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const { toast } = useToast();
  const { businessId, businessName } = useBusinessContext();
  const { t } = useLanguage();

  useEffect(() => {
    fetchDentists();
  }, [businessId]);

  const fetchDentists = async () => {
    if (!businessId) return;

    try {
      // Get all dentists for this business via business_members
      const { data: businessMembers, error: membersError } = await supabase
        .from('business_members')
        .select('profile_id')
        .eq('business_id', businessId)
        .in('role', ['dentist', 'admin', 'owner']);

      if (membersError) throw membersError;

      if (!businessMembers || businessMembers.length === 0) {
        setDentists([]);
        return;
      }

      const profileIds = businessMembers.map(m => m.profile_id);

      const { data, error } = await supabase
        .from('dentists')
        .select(`
          id,
          is_active,
          created_at,
          specialty,
          license_number,
          clinic_address,
          bio,
          education,
          years_of_experience,
          languages,
          profiles (
            id,
            first_name,
            last_name,
            email,
            phone,
            role
          )
        `)
        .in('profile_id', profileIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDentists(data || []);
    } catch (error: unknown) {
      toast({
        title: t.error || "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleAddDentist = async () => {
    if (!newDentistEmail.trim()) {
      toast({
        title: t.error || "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newDentistEmail)) {
      toast({
        title: t.error || "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!businessId) {
      toast({
        title: "Error",
        description: "No business selected. Please select a clinic first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('secure_profiles_view')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('dentist_invitations')
        .select('id')
        .eq('invitee_email', newDentistEmail)
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        toast({
          title: "Invitation Already Sent",
          description: `A pending invitation already exists for ${newDentistEmail}`,
        });
        setNewDentistEmail("");
        return;
      }

      // Create dentist invitation
      const { error: inviteError } = await supabase
        .from('dentist_invitations')
        .insert({
          business_id: businessId,
          inviter_profile_id: profile.id,
          invitee_email: newDentistEmail,
        });

      if (inviteError) {
        // Check if it's an RLS error (only owner can invite)
        if (inviteError.code === '42501') {
          toast({
            title: "Permission Denied",
            description: "Only the clinic owner can invite dentists to this clinic.",
            variant: "destructive",
          });
        } else {
          throw inviteError;
        }
        return;
      }

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${newDentistEmail}. They will see it when they log in.`,
      });

      setNewDentistEmail("");
      fetchDentists();
    } catch (error: unknown) {
      console.error('Error adding dentist:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateDentist = async (dentistId: string) => {
    if (!businessId) return;

    try {
      const dentist = dentists.find(d => d.id === dentistId);
      if (!dentist) return;

      const { data, error } = await supabase.rpc('safe_deactivate_dentist', {
        p_dentist_id: dentistId,
        p_business_id: businessId,
      });

      if (error) throw error;

      toast({
        title: t.dentistDeactivated || "Dentist Deactivated",
        description: (t.dentistDeactivatedDesc || "The dentist has been deactivated and removed from this clinic."),
      });

      fetchDentists();
    } catch (error: unknown) {
      toast({
        title: t.error || "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate dentist",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (dentistId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('dentists')
        .update({ is_active: !currentStatus })
        .eq('id', dentistId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Dentist has been ${!currentStatus ? 'activated' : 'deactivated'}.`,
      });

      fetchDentists();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDentist) return;

    try {
      const { error } = await supabase
        .from('dentists')
        .update({
          specialty: editingDentist.specialty,
          license_number: editingDentist.license_number,
          clinic_address: editingDentist.clinic_address,
          bio: editingDentist.bio,
          education: editingDentist.education,
          years_of_experience: editingDentist.years_of_experience,
          languages: editingDentist.languages,
        })
        .eq('id', editingDentist.id);

      if (error) throw error;

      toast({
        title: "Dentist Updated",
        description: "Dentist information has been updated successfully.",
      });

      setEditingDentist(null);
      fetchDentists();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update dentist",
        variant: "destructive",
      });
    }
  };

  const handleBulkActivate = async () => {
    setBulkActionLoading(true);
    try {
      const dentistIds = Array.from(selectedDentists);
      const { error } = await supabase
        .from('dentists')
        .update({ is_active: true })
        .in('id', dentistIds);

      if (error) throw error;

      toast({
        title: "Bulk Action Complete",
        description: `${dentistIds.length} dentist(s) have been activated.`,
      });

      setSelectedDentists(new Set());
      fetchDentists();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to activate dentists",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    setBulkActionLoading(true);
    try {
      const dentistIds = Array.from(selectedDentists);
      const { error } = await supabase
        .from('dentists')
        .update({ is_active: false })
        .in('id', dentistIds);

      if (error) throw error;

      toast({
        title: "Bulk Action Complete",
        description: `${dentistIds.length} dentist(s) have been deactivated.`,
      });

      setSelectedDentists(new Set());
      fetchDentists();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate dentists",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleDentistSelection = (dentistId: string) => {
    const newSelection = new Set(selectedDentists);
    if (newSelection.has(dentistId)) {
      newSelection.delete(dentistId);
    } else {
      newSelection.add(dentistId);
    }
    setSelectedDentists(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDentists.size === filteredDentists.length) {
      setSelectedDentists(new Set());
    } else {
      setSelectedDentists(new Set(filteredDentists.map(d => d.id)));
    }
  };

  const filteredDentists = dentists.filter(dentist => {
    const profile = dentist.profiles;
    const searchLower = searchTerm.toLowerCase();
    return !searchTerm ||
      profile.first_name?.toLowerCase().includes(searchLower) ||
      profile.last_name?.toLowerCase().includes(searchLower) ||
      profile.email?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* Add New Dentist */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-dental-primary">
            <UserPlus className="h-5 w-5" />
            <span>Add New Dentist</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">How it works</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Enter the email address of the dentist you want to add. We'll send them an invitation email with instructions to set up their account and access the dentist dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="dentistEmail" className="text-sm font-medium">
                Dentist Email Address
              </Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="dentistEmail"
                  type="email"
                  placeholder="doctor@example.com"
                  value={newDentistEmail}
                  onChange={(e) => setNewDentistEmail(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddDentist();
                    }
                  }}
                />
                <Button
                  onClick={handleAddDentist}
                  disabled={loading || !newDentistEmail.trim()}
                  className="bg-dental-primary hover:bg-dental-primary/90 text-white"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-emerald-900 dark:text-emerald-100">New User?</h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                  No problem! If they don't have an account yet, we'll create one and send them an invitation email. If they already have an account, they'll be promoted to dentist automatically.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dentist List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-dental-primary">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Dentist Profiles</span>
            </div>
            {selectedDentists.size > 0 && (
              <Badge variant="secondary">
                {selectedDentists.size} selected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search dentists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bulk Actions */}
          {selectedDentists.size > 0 && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkActivate}
                disabled={bulkActionLoading}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Power className="h-4 w-4 mr-2" />
                Activate Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDeactivate}
                disabled={bulkActionLoading}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <Power className="h-4 w-4 mr-2" />
                Deactivate Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDentists(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Select All */}
          {filteredDentists.length > 0 && (
            <div className="flex items-center space-x-2 p-2 border-b">
              <Checkbox
                checked={selectedDentists.size === filteredDentists.length && filteredDentists.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          )}

          {/* Dentist List */}
          <div className="space-y-3">
            {filteredDentists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No dentists found</p>
              </div>
            ) : (
              filteredDentists.map((dentist) => {
                const profile = dentist.profiles;
                const isCurrentUser = dentist.id === currentDentistId;
                const isSelected = selectedDentists.has(dentist.id);

                return (
                  <div
                    key={dentist.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      isSelected ? 'bg-blue-50 border-blue-200' :
                      isCurrentUser ? 'bg-dental-primary/10 border-dental-primary/20' :
                      'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDentistSelection(dentist.id)}
                      />
                      <div className="w-10 h-10 bg-dental-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-dental-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="font-medium">
                            {profile.first_name} {profile.last_name}
                          </h4>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                          <Badge variant={dentist.is_active ? "default" : "secondary"}>
                            {dentist.is_active ? (t.active || "Active") : (t.inactive || "Inactive")}
                          </Badge>
                          {dentist.specialty && (
                            <Badge variant="outline" className="text-xs">{dentist.specialty}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                        {dentist.license_number && (
                          <p className="text-xs text-muted-foreground">License: {dentist.license_number}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(dentist.id, dentist.is_active)}
                        title={dentist.is_active ? "Deactivate" : "Activate"}
                      >
                        <Power className={`h-4 w-4 ${dentist.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingDentist({...dentist})}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDentist(dentist)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {!isCurrentUser && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                              <Power className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t.deactivateDentist || "Deactivate Dentist"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-muted-foreground">
                                {t.deactivateDentistConfirm || `Are you sure you want to deactivate ${profile.first_name} ${profile.last_name}?`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {t.deactivateDentistDesc || "This will deactivate the dentist and cancel their future appointments. Past records will be preserved."}
                              </p>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline">{t.cancel || 'Cancel'}</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    handleDeactivateDentist(dentist.id);
                                  }}
                                >
                                  {t.deactivateDentist || "Deactivate"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dentist Details Dialog */}
      {selectedDentist && (
        <Dialog open={!!selectedDentist} onOpenChange={() => setSelectedDentist(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dentist Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-dental-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-dental-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedDentist.profiles.first_name} {selectedDentist.profiles.last_name}
                  </h3>
                  <p className="text-muted-foreground">{selectedDentist.profiles.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={selectedDentist.is_active ? "default" : "secondary"}>
                    {selectedDentist.is_active ? (t.active || "Active") : (t.inactive || "Inactive")}
                  </Badge>
                </div>
                {selectedDentist.specialty && (
                  <div className="flex justify-between">
                    <span className="font-medium">Specialty:</span>
                    <span className="text-muted-foreground">{selectedDentist.specialty}</span>
                  </div>
                )}
                {selectedDentist.license_number && (
                  <div className="flex justify-between">
                    <span className="font-medium">License:</span>
                    <span className="text-muted-foreground">{selectedDentist.license_number}</span>
                  </div>
                )}
                {selectedDentist.years_of_experience && (
                  <div className="flex justify-between">
                    <span className="font-medium">Experience:</span>
                    <span className="text-muted-foreground">{selectedDentist.years_of_experience} years</span>
                  </div>
                )}
                {selectedDentist.education && (
                  <div className="flex justify-between">
                    <span className="font-medium">Education:</span>
                    <span className="text-muted-foreground text-sm">{selectedDentist.education}</span>
                  </div>
                )}
                {selectedDentist.languages && (
                  <div className="flex justify-between">
                    <span className="font-medium">Languages:</span>
                    <span className="text-muted-foreground text-sm">{selectedDentist.languages}</span>
                  </div>
                )}
                {selectedDentist.clinic_address && (
                  <div className="flex justify-between">
                    <span className="font-medium">Address:</span>
                    <span className="text-muted-foreground text-sm">{selectedDentist.clinic_address}</span>
                  </div>
                )}
                {selectedDentist.bio && (
                  <div>
                    <span className="font-medium">Bio:</span>
                    <p className="text-muted-foreground text-sm mt-1">{selectedDentist.bio}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">{t.joined || 'Joined'}:</span>
                  <span className="text-muted-foreground">
                    {new Date(selectedDentist.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dentist Dialog */}
      {editingDentist && (
        <Dialog open={!!editingDentist} onOpenChange={() => setEditingDentist(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Dentist Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input
                    id="specialty"
                    value={editingDentist.specialty || ''}
                    onChange={(e) => setEditingDentist({...editingDentist, specialty: e.target.value})}
                    placeholder="e.g., General Dentistry, Orthodontics"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={editingDentist.license_number || ''}
                    onChange={(e) => setEditingDentist({...editingDentist, license_number: e.target.value})}
                    placeholder="Professional license number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={editingDentist.education || ''}
                  onChange={(e) => setEditingDentist({...editingDentist, education: e.target.value})}
                  placeholder="e.g., DDS from Harvard School of Dental Medicine"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years_of_experience">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    value={editingDentist.years_of_experience || ''}
                    onChange={(e) => setEditingDentist({...editingDentist, years_of_experience: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="languages">Languages</Label>
                  <Input
                    id="languages"
                    value={editingDentist.languages || ''}
                    onChange={(e) => setEditingDentist({...editingDentist, languages: e.target.value})}
                    placeholder="e.g., English, Spanish, French"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_address">Clinic Address</Label>
                <Input
                  id="clinic_address"
                  value={editingDentist.clinic_address || ''}
                  onChange={(e) => setEditingDentist({...editingDentist, clinic_address: e.target.value})}
                  placeholder="Full clinic address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editingDentist.bio || ''}
                  onChange={(e) => setEditingDentist({...editingDentist, bio: e.target.value})}
                  placeholder="Professional bio and background..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDentist(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
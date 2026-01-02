import { useState, useEffect } from "react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, Sparkles } from "lucide-react";
import { LoadingSpinner } from "@/components/enhanced/LoadingSpinner";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export function HomepageEditor() {
  const { businessId } = useBusinessContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    hero_title: "Welcome to Our Practice",
    hero_subtitle: "Quality dental care for your whole family",
    hero_image_url: "",
    show_services: true,
    show_about: true,
    about_title: "About Us",
    about_content: "We are dedicated to providing exceptional dental care...",
    cta_text: "Book Appointment",
    cta_link: "/book-appointment",
  });
  const [initialSettings, setInitialSettings] = useState(settings);

  useEffect(() => {
    loadSettings();
  }, [businessId]);

  const loadSettings = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from("homepage_settings")
        .select("*")
        .eq("business_id", businessId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        const loaded = {
          hero_title: data.hero_title || settings.hero_title,
          hero_subtitle: data.hero_subtitle || settings.hero_subtitle,
          hero_image_url: data.hero_image_url || "",
          show_services: data.show_services ?? true,
          show_about: data.show_about ?? true,
          about_title: data.about_title || settings.about_title,
          about_content: data.about_content || settings.about_content,
          cta_text: data.cta_text || settings.cta_text,
          cta_link: data.cta_link || settings.cta_link,
        };
        setSettings(loaded);
        setInitialSettings(loaded);
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Error loading homepage settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("homepage_settings")
        .upsert({
          business_id: businessId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Homepage Updated",
        description: "Your homepage settings have been saved successfully.",
      });
      setInitialSettings(settings);
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving homepage settings:", error);
      toast({
        title: "Error",
        description: "Failed to save homepage settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(initialSettings));
  }, [settings, initialSettings]);

  useUnsavedChanges({
    when: hasChanges,
    onNavigate: handleSave,
  });

  const handlePreview = async () => {
    const { data: business } = await supabase
      .from("businesses")
      .select("slug")
      .eq("id", businessId)
      .single();

    if (business?.slug) {
      window.open(`/${business.slug}`, "_blank");
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Homepage Customization</h2>
          <p className="text-muted-foreground">
            Customize your business homepage that visitors see
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Hero Section
          </CardTitle>
          <CardDescription>The main banner that visitors see first</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_title">Hero Title</Label>
            <Input
              id="hero_title"
              value={settings.hero_title}
              onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
              placeholder="Welcome to Our Practice"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
            <Input
              id="hero_subtitle"
              value={settings.hero_subtitle}
              onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
              placeholder="Quality dental care for your whole family"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero_image_url">Hero Background Image URL (optional)</Label>
            <Input
              id="hero_image_url"
              value={settings.hero_image_url}
              onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>About Section</CardTitle>
              <CardDescription>Tell visitors about your practice</CardDescription>
            </div>
            <Switch
              checked={settings.show_about}
              onCheckedChange={(checked) => setSettings({ ...settings, show_about: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="about_title">Section Title</Label>
            <Input
              id="about_title"
              value={settings.about_title}
              onChange={(e) => setSettings({ ...settings, about_title: e.target.value })}
              placeholder="About Us"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about_content">Content</Label>
            <Textarea
              id="about_content"
              value={settings.about_content}
              onChange={(e) => setSettings({ ...settings, about_content: e.target.value })}
              placeholder="Tell your story..."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Services Section</CardTitle>
              <CardDescription>Display your services (managed in Services tab)</CardDescription>
            </div>
            <Switch
              checked={settings.show_services}
              onCheckedChange={(checked) => setSettings({ ...settings, show_services: checked })}
            />
          </div>
        </CardHeader>
      </Card>

      {/* CTA Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Call-to-Action Button</CardTitle>
          <CardDescription>The main action button throughout the page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cta_text">Button Text</Label>
            <Input
              id="cta_text"
              value={settings.cta_text}
              onChange={(e) => setSettings({ ...settings, cta_text: e.target.value })}
              placeholder="Book Appointment"
            />
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

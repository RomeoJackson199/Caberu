import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, User, Shield, Globe, Link2 } from 'lucide-react';
import { ReminderPreferences } from '@/components/patients/ReminderPreferences';
import { PatientSecuritySettings } from '@/components/patients/PatientSecuritySettings';
import { AccountLinkingSection } from '@/components/auth/AccountLinkingSection';
import { AnimatedBackground, SectionHeader } from '@/components/ui/polished-components';
import { LanguageSettings } from '@/components/shared/LanguagePicker';
import { useLanguage } from '@/hooks/useLanguage';

export default function PatientSettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 rounded-2xl p-6 border">
        <AnimatedBackground />

        <div className="relative z-10">
          <SectionHeader
            icon={User}
            title={t.settings}
            description={t.general}
            gradient="from-slate-600 to-gray-600"
          />
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t.appointments}</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t.language}</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t.myProfile}</span>
          </TabsTrigger>
          <TabsTrigger value="linked" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Linked</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t.settings}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <ReminderPreferences />
        </TabsContent>

        <TabsContent value="language">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t.language}</CardTitle>
                  <CardDescription>
                    {t.selectPreferredLanguage}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LanguageSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <div className="text-center py-12 text-muted-foreground">
            {t.myProfile} - {t.loading}
          </div>
        </TabsContent>

        <TabsContent value="linked">
          <AccountLinkingSection />
        </TabsContent>

        <TabsContent value="security">
          <PatientSecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

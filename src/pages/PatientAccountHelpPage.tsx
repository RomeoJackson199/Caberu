import React from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export default function PatientAccountHelpPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2"><HelpCircle className="h-5 w-5" /> {t.pnav.account.help}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t.pnav.account.help}</CardTitle>
        </CardHeader>
        <CardContent className="space-x-2">
          <Button asChild><Link to="/support">{t.contactSupport}</Link></Button>
          <Button variant="outline" asChild><Link to="/privacy">{t.privacyPolicyLink}</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}


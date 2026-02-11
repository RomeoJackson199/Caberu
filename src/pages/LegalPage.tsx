import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

type Locale = "en" | "fr" | "nl";
type DocumentType = "privacy" | "terms" | "cookies";

interface CookieRow {
  name: string;
  purpose: string;
  duration: string;
}

interface LegalPageProps {
  locale: Locale;
  document: DocumentType;
}

const cookieRows: Record<Locale, CookieRow[]> = {
  en: [
    { name: "cookie-consent", purpose: "Stores your cookie choices.", duration: "12 months" },
    { name: "analytics_consent", purpose: "Stores whether analytics is allowed.", duration: "12 months" },
    { name: "sb-access-token", purpose: "Keeps authenticated sessions active.", duration: "Session" },
    { name: "sb-refresh-token", purpose: "Refreshes authenticated sessions.", duration: "Up to 30 days" },
    { name: "_ga / _gid (only after consent)", purpose: "Google Analytics traffic measurement.", duration: "24 hours to 13 months" },
  ],
  fr: [
    { name: "cookie-consent", purpose: "Enregistre vos choix de cookies.", duration: "12 mois" },
    { name: "analytics_consent", purpose: "Enregistre si l'analytics est autorisé.", duration: "12 mois" },
    { name: "sb-access-token", purpose: "Maintient la session utilisateur connectée.", duration: "Session" },
    { name: "sb-refresh-token", purpose: "Renouvelle la session utilisateur.", duration: "Jusqu'à 30 jours" },
    { name: "_ga / _gid (après consentement)", purpose: "Mesure du trafic Google Analytics.", duration: "24 heures à 13 mois" },
  ],
  nl: [
    { name: "cookie-consent", purpose: "Slaat uw cookiekeuzes op.", duration: "12 maanden" },
    { name: "analytics_consent", purpose: "Slaat op of analytics is toegestaan.", duration: "12 maanden" },
    { name: "sb-access-token", purpose: "Houdt ingelogde sessies actief.", duration: "Sessie" },
    { name: "sb-refresh-token", purpose: "Vernieuwt ingelogde sessies.", duration: "Tot 30 dagen" },
    { name: "_ga / _gid (alleen na toestemming)", purpose: "Google Analytics verkeersmeting.", duration: "24 uur tot 13 maanden" },
  ],
};

const copy: Record<Locale, Record<DocumentType, { title: string; intro: string; sections: { title: string; body: string }[] }>> = {
  en: {
    privacy: {
      title: "Privacy Policy",
      intro: "How Caberu handles personal data for website visitors, patients, and clinics.",
      sections: [
        { title: "Data we collect", body: "Account details, support messages, technical logs, and patient records entered by clinics." },
        { title: "Why we process data", body: "To provide the platform, secure accounts, prevent abuse, and improve service quality." },
        { title: "Legal bases", body: "Contract, legal obligations, legitimate interests, and consent where required." },
        { title: "Your rights", body: "You can request access, correction, deletion, restriction, objection, and portability by emailing Romeo@caberu.be." },
      ],
    },
    terms: {
      title: "Terms of Service",
      intro: "Rules for using Caberu's public website and platform.",
      sections: [
        { title: "Acceptable use", body: "Do not misuse the service, attempt unauthorized access, or upload unlawful content." },
        { title: "Accounts", body: "You are responsible for account credentials and all activity under your account." },
        { title: "Billing", body: "Paid plans are billed in advance. You can cancel according to your subscription terms." },
        { title: "Liability", body: "Caberu provides the service as-is and is liable only as allowed by applicable law." },
      ],
    },
    cookies: {
      title: "Cookie Policy",
      intro: "Cookies used on caberu.be and how to change your consent.",
      sections: [
        { title: "How to withdraw consent", body: "Open the cookie banner and choose 'Necessary Only'. This immediately blocks analytics and removes GA/GTM cookies." },
        { title: "Contact", body: "Questions about cookies: Romeo@caberu.be." },
      ],
    },
  },
  fr: {
    privacy: {
      title: "Politique de confidentialité",
      intro: "Comment Caberu traite les données personnelles des visiteurs, patients et cabinets.",
      sections: [
        { title: "Données collectées", body: "Données de compte, messages de support, journaux techniques et dossiers patients saisis par les cabinets." },
        { title: "Finalités", body: "Fournir la plateforme, sécuriser les comptes, prévenir les abus et améliorer le service." },
        { title: "Bases légales", body: "Contrat, obligations légales, intérêts légitimes et consentement lorsque requis." },
        { title: "Vos droits", body: "Vous pouvez demander l'accès, la rectification, l'effacement, la limitation, l'opposition et la portabilité via Romeo@caberu.be." },
      ],
    },
    terms: {
      title: "Conditions d'utilisation",
      intro: "Règles d'utilisation du site public et de la plateforme Caberu.",
      sections: [
        { title: "Utilisation autorisée", body: "N'utilisez pas le service de manière abusive et n'essayez pas d'accéder sans autorisation." },
        { title: "Comptes", body: "Vous êtes responsable de vos identifiants et des actions réalisées via votre compte." },
        { title: "Facturation", body: "Les abonnements payants sont facturés à l'avance. Résiliation selon vos conditions d'abonnement." },
        { title: "Responsabilité", body: "Le service est fourni en l'état, avec responsabilité limitée selon la loi applicable." },
      ],
    },
    cookies: {
      title: "Politique de cookies",
      intro: "Cookies utilisés sur caberu.be et méthode pour retirer votre consentement.",
      sections: [
        { title: "Retirer le consentement", body: "Ouvrez la bannière cookies puis choisissez 'Necessary Only'. Cela bloque l'analytics et supprime les cookies GA/GTM." },
        { title: "Contact", body: "Questions sur les cookies : Romeo@caberu.be." },
      ],
    },
  },
  nl: {
    privacy: {
      title: "Privacybeleid",
      intro: "Hoe Caberu persoonsgegevens verwerkt van bezoekers, patiënten en praktijken.",
      sections: [
        { title: "Welke gegevens", body: "Accountgegevens, supportberichten, technische logs en patiëntgegevens ingevoerd door praktijken." },
        { title: "Waarom verwerking", body: "Om het platform te leveren, accounts te beveiligen, misbruik te voorkomen en de dienst te verbeteren." },
        { title: "Rechtsgronden", body: "Contract, wettelijke verplichtingen, gerechtvaardigd belang en toestemming waar nodig." },
        { title: "Uw rechten", body: "U kunt inzage, correctie, verwijdering, beperking, bezwaar en dataportabiliteit aanvragen via Romeo@caberu.be." },
      ],
    },
    terms: {
      title: "Gebruiksvoorwaarden",
      intro: "Regels voor gebruik van de publieke website en het Caberu-platform.",
      sections: [
        { title: "Toegestaan gebruik", body: "Misbruik de dienst niet, probeer geen ongeoorloofde toegang en upload geen onwettige inhoud." },
        { title: "Accounts", body: "U bent verantwoordelijk voor uw inloggegevens en activiteit onder uw account." },
        { title: "Facturatie", body: "Betaalde abonnementen worden vooraf gefactureerd. Opzeggen volgens uw abonnementsvoorwaarden." },
        { title: "Aansprakelijkheid", body: "Caberu levert de dienst zoals die is, met aansprakelijkheid binnen de grenzen van de wet." },
      ],
    },
    cookies: {
      title: "Cookiebeleid",
      intro: "Cookies op caberu.be en hoe u toestemming kunt intrekken.",
      sections: [
        { title: "Toestemming intrekken", body: "Open de cookiebanner en kies 'Necessary Only'. Analytics wordt direct geblokkeerd en GA/GTM-cookies worden verwijderd." },
        { title: "Contact", body: "Vragen over cookies: Romeo@caberu.be." },
      ],
    },
  },
};

const languageLinks: Record<Locale, { label: string; privacy: string; terms: string; cookies: string }> = {
  en: { label: "English", privacy: "/privacy", terms: "/terms", cookies: "/cookies" },
  fr: { label: "Français", privacy: "/fr/privacy", terms: "/fr/terms", cookies: "/fr/cookies" },
  nl: { label: "Nederlands", privacy: "/nl/privacy", terms: "/nl/terms", cookies: "/nl/cookies" },
};

export default function LegalPage({ locale, document }: LegalPageProps) {
  const page = copy[locale][document];

  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal />
      <main className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">{page.title}</h1>
          <p className="text-gray-600">{page.intro}</p>
          <p className="text-sm text-gray-500">Last updated: 11 February 2026</p>
        </div>

        <Card className="p-5">
          <p className="font-semibold mb-2">Languages</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(languageLinks).map(([key, value]) => (
              <Link
                className="text-blue-600 hover:underline"
                key={key}
                to={value[document]}
              >
                {value.label}
              </Link>
            ))}
          </div>
        </Card>

        {document === "cookies" && (
          <Card className="p-5 overflow-x-auto">
            <h2 className="text-2xl font-semibold mb-4">Cookies in use</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Cookie</th>
                  <th className="border p-2 text-left">Purpose</th>
                  <th className="border p-2 text-left">Duration</th>
                </tr>
              </thead>
              <tbody>
                {cookieRows[locale].map((row) => (
                  <tr key={row.name}>
                    <td className="border p-2 font-medium">{row.name}</td>
                    <td className="border p-2">{row.purpose}</td>
                    <td className="border p-2">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {page.sections.map((section) => (
          <Card key={section.title} className="p-5 space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
            <p className="text-gray-700">{section.body}</p>
          </Card>
        ))}
      </main>
      <Footer />
    </div>
  );
}

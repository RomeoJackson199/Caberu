import { Card } from "@/components/ui/card";
import { Cookie, Shield, BarChart, Target, Settings } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CookiePolicyNl = () => {
  const handleWithdrawConsent = () => {
    // Clear consent
    localStorage.removeItem('cookie-consent');
    localStorage.removeItem('analytics_consent');

    // Reload page to show banner again
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-blue-100">
            <Cookie className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Cookiebeleid</h1>
          <p className="text-gray-600">
            Ingangsdatum: 11 februari 2026 | Laatst bijgewerkt: 11 februari 2026
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Dit Cookiebeleid legt uit hoe Caberu SRL ("wij", "ons" of "onze") cookies en vergelijkbare
            trackingtechnologieën gebruikt op onze website <a href="https://caberu.be" className="text-blue-600 hover:underline">https://caberu.be</a>.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Wij respecteren uw privacy en zijn toegewijd aan transparantie over de cookies die we gebruiken.
            U heeft volledige controle over welke cookies u accepteert.
          </p>
        </section>

        {/* What are Cookies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Wat zijn Cookies?</h2>
          <p className="text-gray-700 leading-relaxed">
            Cookies zijn kleine tekstbestanden die op uw apparaat (computer, tablet of mobiel) worden opgeslagen
            wanneer u een website bezoekt. Ze helpen websites uw voorkeuren te onthouden en uw browse-ervaring
            te verbeteren.
          </p>
        </section>

        {/* Cookies We Use */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Cookies die Wij Gebruiken</h2>

          {/* Essential Cookies */}
          <Card className="p-6 border-green-200 bg-green-50">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">1. Essentiële Cookies (Altijd Actief)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Deze cookies zijn noodzakelijk voor het functioneren van de website en kunnen niet worden uitgeschakeld.
                  Ze maken basisfuncties mogelijk zoals veilige inloggen, sessiebeheer en paginanavigatie.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">sb-auth-token</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Doel:</strong> Gebruikersauthenticatie en sessiebeheer</p>
                      <p><strong>Duur:</strong> Sessie (verwijderd bij sluiten van browser)</p>
                      <p><strong>Provider:</strong> Supabase (onze authenticatieprovider)</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">cookie-consent</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Doel:</strong> Slaat uw cookievoorkeuren op</p>
                      <p><strong>Duur:</strong> 1 jaar</p>
                      <p><strong>Provider:</strong> Caberu</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">theme</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Doel:</strong> Onthoudt uw licht/donker modus voorkeur</p>
                      <p><strong>Duur:</strong> Persistent</p>
                      <p><strong>Provider:</strong> Caberu</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Analytics Cookies */}
          <Card className="p-6 border-blue-200 bg-blue-50">
            <div className="flex items-start gap-4">
              <BarChart className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">2. Analytische Cookies (Optioneel)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Deze cookies helpen ons te begrijpen hoe bezoekers omgaan met onze website door anoniem informatie
                  te verzamelen. Ze helpen ons onze service te verbeteren en bugs op te lossen.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_ga</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Doel:</strong> Onderscheidt unieke gebruikers voor Google Analytics</p>
                      <p><strong>Duur:</strong> 2 jaar</p>
                      <p><strong>Provider:</strong> Google Analytics</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_gid</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Doel:</strong> Onderscheidt gebruikers voor Google Analytics</p>
                      <p><strong>Duur:</strong> 24 uur</p>
                      <p><strong>Provider:</strong> Google Analytics</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_ga_[container-id]</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Doel:</strong> Behoudt sessiestatus voor Google Analytics 4</p>
                      <p><strong>Duur:</strong> 2 jaar</p>
                      <p><strong>Provider:</strong> Google Analytics 4</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <p className="text-sm text-gray-700">
                    <strong>Opmerking:</strong> We gebruiken IP-anonimisering voor alle analytische cookies om uw
                    privacy te beschermen. Er wordt geen persoonlijk identificeerbare informatie verzameld via analytics.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Marketing Cookies */}
          <Card className="p-6 border-purple-200 bg-purple-50">
            <div className="flex items-start gap-4">
              <Target className="h-8 w-8 text-purple-600 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">3. Marketing Cookies (Optioneel)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Deze cookies volgen bezoekers op websites om relevante advertenties weer te geven.
                  Momenteel gebruiken we geen marketingcookies. Dit gedeelte is gereserveerd voor toekomstig gebruik.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* How to Control Cookies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Hoe Cookies te Beheren
          </h2>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Uw Toestemming Intrekken</h3>
            <p className="text-gray-700 text-sm mb-4">
              U kunt uw cookievoorkeuren op elk moment wijzigen door op de onderstaande knop te klikken.
              Dit zal uw huidige voorkeuren wissen en de cookiebanner opnieuw tonen.
            </p>
            <Button onClick={handleWithdrawConsent} variant="outline">
              Cookievoorkeuren Wijzigen
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Browserinstellingen</h3>
            <p className="text-gray-700 text-sm mb-3">
              U kunt cookies ook beheren via uw browserinstellingen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>
                <strong>Chrome:</strong> Instellingen → Privacy en beveiliging → Cookies en andere sitegegevens
              </li>
              <li>
                <strong>Firefox:</strong> Instellingen → Privacy & Beveiliging → Cookies en sitegegevens
              </li>
              <li>
                <strong>Safari:</strong> Voorkeuren → Privacy → Cookies en websitegegevens
              </li>
              <li>
                <strong>Edge:</strong> Instellingen → Cookies en sitemachtigingen → Cookies en sitegegevens
              </li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              Opmerking: Het blokkeren van essentiële cookies kan ervoor zorgen dat delen van de website niet goed functioneren.
            </p>
          </Card>
        </section>

        {/* Third-Party Services */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Diensten van Derden</h2>
          <p className="text-gray-700 leading-relaxed">
            We gebruiken de volgende diensten van derden die mogelijk cookies plaatsen:
          </p>
          <Card className="p-6">
            <ul className="space-y-3 text-sm text-gray-700">
              <li>
                <strong>Google Analytics 4:</strong> Websiteverkeeranalyse en inzichten in gebruikersgedrag
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Privacybeleid: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>
                </div>
              </li>
              <li>
                <strong>Google Tag Manager:</strong> Tag-beheersysteem voor analytics
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Privacybeleid: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>
                </div>
              </li>
              <li>
                <strong>Supabase:</strong> Backend-services inclusief authenticatie en database
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Privacybeleid: <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a>
                </div>
              </li>
            </ul>
          </Card>
        </section>

        {/* Updates to This Policy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Updates van dit Beleid</h2>
          <p className="text-gray-700 leading-relaxed">
            We kunnen dit Cookiebeleid van tijd tot tijd bijwerken om veranderingen in onze praktijken weer te geven
            of om juridische redenen. De datum "Laatst bijgewerkt" bovenaan toont wanneer wijzigingen zijn aangebracht.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Neem Contact Op</h2>
          <Card className="p-6 bg-gray-50">
            <p className="text-gray-700 mb-3">
              Als u vragen heeft over dit Cookiebeleid of ons gebruik van cookies, neem dan contact met ons op:
            </p>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Caberu SRL</strong></p>
              <p>Hertogenweg 20, België</p>
              <p>Email: <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
            </div>
          </Card>
        </section>

        {/* Related Policies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Gerelateerde Beleidsregels</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/nl/privacy">
              <Button variant="outline" size="sm">Privacybeleid</Button>
            </Link>
            <Link to="/terms">
              <Button variant="outline" size="sm">Gebruiksvoorwaarden</Button>
            </Link>
            <Link to="/dpa">
              <Button variant="outline" size="sm">Gegevensverwerkingsovereenkomst</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicyNl;

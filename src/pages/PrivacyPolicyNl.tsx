import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Mail, Users, Database, Globe, AlertTriangle, Bell } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Link } from "react-router-dom";

const PrivacyPolicyNl = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-blue-100">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Privacybeleid</h1>
          <p className="text-gray-600">
            Ingangsdatum: 9 december 2025 | Laatst bijgewerkt: 9 december 2025
          </p>
        </div>

        {/* 1. Who We Are */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Wie Zijn Wij</h2>
          <Card className="p-6 bg-gray-50">
            <p className="font-semibold mb-2">Caberu SRL</p>
            <p className="text-gray-700">Hertogenweg 20, België</p>
            <p className="text-gray-700">E-mail: <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
            <p className="text-gray-700">Website: <a href="https://caberu.be" className="text-blue-600 hover:underline">https://caberu.be</a></p>
          </Card>
          <p className="text-gray-700 leading-relaxed">
            Caberu biedt een AI-aangedreven platform voor tandartspraktijkbeheer ("Dienst") voor tandartspraktijken in de Europese Unie.
          </p>
        </section>

        {/* 2. Our Role Under GDPR */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            2. Onze Rol onder de AVG
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Caberu handelt in <strong>twee verschillende rollen</strong> afhankelijk van de gegevens:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">2.1 Verwerkingsverantwoordelijke</h3>
              <p className="text-sm text-gray-600 mb-2">(voor Tandartspraktijk Accounts)</p>
              <p className="text-gray-700 text-sm">
                Wanneer u (een tandartspraktijk) een account aanmaakt bij Caberu, <strong>zijn wij de Verwerkingsverantwoordelijke</strong> voor uw bedrijfsinformatie (praktijknaam, tandartsaccounts, contactgegevens, factureringsinformatie).
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">2.2 Verwerker</h3>
              <p className="text-sm text-gray-600 mb-2">(voor Patiënt Gezondheidsgegevens)</p>
              <p className="text-gray-700 text-sm">
                Wanneer u Caberu gebruikt om de gezondheidsdossiers van uw patiënten te beheren, <strong>bent u (de tandartspraktijk) de Verwerkingsverantwoordelijke</strong> en <strong>zijn wij de Verwerker</strong>. Wij verwerken patiënt gezondheidsgegevens alleen namens u.
              </p>
            </Card>
          </div>
        </section>

        {/* 3. What Data We Collect */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            3. Welke Gegevens Wij Verzamelen
          </h2>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.1 Voor Tandartspraktijken (bij aanmelding)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Praktijknaam en bedrijfsinformatie</li>
                <li>Namen van tandartsen en beroepskwalificaties</li>
                <li>Contactinformatie (e-mail, telefoon, adres)</li>
                <li>Facturerings- en betalingsinformatie</li>
                <li>Inloggegevens (e-mail, versleuteld wachtwoord)</li>
              </ul>
            </Card>

            <Card className="p-6 border-orange-200 bg-orange-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.2 Voor Patiënten (Gezondheidsgegevens - Bijzondere Categorie onder AVG Artikel 9)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Persoonlijke informatie (naam, geboortedatum, contactgegevens)</li>
                <li>Tandheelkundige medische geschiedenis en aandoeningen</li>
                <li>Behandeldossiers en diagnoses</li>
                <li>Voorschriften en medicijnen</li>
                <li>Afsprakengeschiedenis</li>
                <li>Klinische notities en röntgenfoto's</li>
                <li>Verzekeringsinformatie</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.3 Technische Gegevens (Automatisch Verzameld)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Apparaatinformatie (browsertype, besturingssysteem)</li>
                <li>IP-adres en locatiegegevens</li>
                <li>Bezochte pagina's en gebruikte functies</li>
                <li>Sessieduur en cookies</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 4. Legal Basis for Processing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            4. Rechtsgrondslag voor Verwerking (AVG Artikel 6 & 9)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Gegevenstype</th>
                  <th className="border p-3 text-left">Rechtsgrondslag</th>
                  <th className="border p-3 text-left">AVG Artikel</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Bedrijfsgegevens tandartspraktijk</td>
                  <td className="border p-3">Uitvoering overeenkomst</td>
                  <td className="border p-3">Art. 6(1)(b)</td>
                </tr>
                <tr className="bg-orange-50">
                  <td className="border p-3 font-medium">Gezondheidsgegevens patiënt</td>
                  <td className="border p-3">Verwerking namens Verantwoordelijke + Expliciete toestemming</td>
                  <td className="border p-3">Art. 6(1)(b) + Art. 9(2)(a)</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Betalingsinformatie</td>
                  <td className="border p-3">Overeenkomst + Wettelijke verplichting</td>
                  <td className="border p-3">Art. 6(1)(b) + Art. 6(1)(c)</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Analyses</td>
                  <td className="border p-3">Gerechtvaardigd belang + Toestemming</td>
                  <td className="border p-3">Art. 6(1)(f) + Art. 6(1)(a)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Card className="p-4 bg-orange-50 border-orange-200">
            <p className="text-sm text-gray-700">
              <strong>Bijzondere Opmerking over Gezondheidsgegevens:</strong> Gezondheidsgegevens zijn bijzondere categorieën van gegevens volgens AVG Artikel 9. Wij verwerken deze alleen met expliciete toestemming van de patiënt EN namens de tandartspraktijk (als hun Verwerker).
            </p>
          </Card>
        </section>

        {/* 5. How We Use Your Data */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. Hoe Wij Uw Gegevens Gebruiken</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">✅ Wij DOEN:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✓ De Dienst leveren en onderhouden</li>
                <li>✓ Tandartspraktijk accounts aanmaken en beheren</li>
                <li>✓ Afsprakenplanning mogelijk maken</li>
                <li>✓ Patiënt gezondheidsdossiers opslaan</li>
                <li>✓ Betalingen en facturering verwerken</li>
                <li>✓ Afspraakherinneringen verzenden</li>
                <li>✓ Klantenondersteuning bieden</li>
                <li>✓ Onze Dienst verbeteren</li>
                <li>✓ Voldoen aan wettelijke verplichtingen</li>
              </ul>
            </Card>

            <Card className="p-6 bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-800 mb-3">❌ Wij DOEN NIET:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✗ Uw gegevens verkopen aan derden</li>
                <li>✗ Patiënt gezondheidsgegevens gebruiken voor marketing</li>
                <li>✗ Gegevens delen behalve zoals beschreven</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 6. Data Sharing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            6. Gegevensdeling en Openbaarmaking
          </h2>

          <h3 className="text-lg font-semibold">6.1 Dienstverleners (Subverwerkers)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Aanbieder</th>
                  <th className="border p-3 text-left">Doel</th>
                  <th className="border p-3 text-left">Locatie</th>
                  <th className="border p-3 text-left">Waarborgen</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Supabase</td>
                  <td className="border p-3">Database & Authenticatie</td>
                  <td className="border p-3">EU</td>
                  <td className="border p-3">AVG-conform</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Google Analytics</td>
                  <td className="border p-3">Website analyses</td>
                  <td className="border p-3">EU & VS</td>
                  <td className="border p-3">Geanonimiseerd IP</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Stripe</td>
                  <td className="border p-3">Betalingen</td>
                  <td className="border p-3">EU</td>
                  <td className="border p-3">PCI-DSS</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. International Transfers */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            7. Internationale Gegevensoverdrachten
          </h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>Alle gegevens worden opgeslagen binnen de Europese Unie</strong> (Supabase EU-regio). Google Analytics kan geanonimiseerde analysegegevens overdragen naar de VS, gedekt door Standaard Contractuele Bepalingen (SCB's) en IP-anonimisering.
          </p>
        </section>

        {/* 8. Data Security */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            8. Gegevensbeveiliging
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🔒 Versleuteling</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• TLS 1.3 tijdens transport</li>
                <li>• AES-256 in rust</li>
                <li>• Bcrypt wachtwoord-hashing</li>
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🔐 Toegangscontroles</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Beveiliging op rijniveau</li>
                <li>• Multi-factor authenticatie</li>
                <li>• 15-minuten sessie time-out</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 9. Data Retention */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Gegevensbewaring</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Gegevenstype</th>
                  <th className="border p-3 text-left">Bewaring</th>
                  <th className="border p-3 text-left">Reden</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3">Patiënt gezondheidsdossiers</td>
                  <td className="border p-3">30 jaar</td>
                  <td className="border p-3">Belgische wetgeving medische dossiers</td>
                </tr>
                <tr>
                  <td className="border p-3">Praktijkaccounts</td>
                  <td className="border p-3">Tot verwijdering + 90 dagen</td>
                  <td className="border p-3">Dienstverlening</td>
                </tr>
                <tr>
                  <td className="border p-3">Factureringsgegevens</td>
                  <td className="border p-3">7 jaar</td>
                  <td className="border p-3">Belastingwetten</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. Your Rights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" />
            10. Uw Rechten onder de AVG
          </h2>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { right: "Recht op Inzage", article: "Art. 15", desc: "Een kopie van uw gegevens opvragen" },
              { right: "Recht op Rectificatie", article: "Art. 16", desc: "Onjuiste gegevens corrigeren" },
              { right: "Recht op Vergetelheid", article: "Art. 17", desc: "Verwijdering van uw gegevens vragen" },
              { right: "Recht op Beperking Verwerking", article: "Art. 18", desc: "Beperken hoe wij uw gegevens gebruiken" },
              { right: "Recht op Gegevensoverdraagbaarheid", article: "Art. 20", desc: "Gegevens ontvangen in JSON/CSV" },
              { right: "Recht van Bezwaar", article: "Art. 21", desc: "Bezwaar maken tegen verwerking" },
              { right: "Recht om Toestemming in te Trekken", article: "Art. 7(3)", desc: "Toestemming op elk moment intrekken" },
            ].map((item, i) => (
              <Card key={i} className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-sm">✅ {item.right}</h3>
                  <span className="text-xs text-gray-500">{item.article}</span>
                </div>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Hoe Uw Rechten Uit te Oefenen
            </h3>
            <p className="text-sm text-gray-700">
              Log in op uw account → Instellingen → Gegevens & Privacy, of e-mail <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a> met "Gegevensverzoek" in het onderwerp. Wij reageren binnen <strong>30 dagen</strong>.
            </p>
          </Card>
        </section>

        {/* 11. Data Breach */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            11. Melding Gegevenslek
          </h2>
          <p className="text-gray-700 leading-relaxed">
            In het geval van een gegevenslek zullen wij de <strong>Belgische Gegevensbeschermingsautoriteit binnen 72 uur</strong> verwittigen (AVG Art. 33) en getroffen personen zonder onnodige vertraging als het risico hoog is (AVG Art. 34).
          </p>
        </section>

        {/* 12. Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            12. Contact & Klachten
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Functionaris voor Gegevensbescherming</h3>
              <p className="text-sm text-gray-700">
                E-mail: <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a><br />
                Onderwerp: "Gegevensbescherming Vraag"
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Klachten</h3>
              <p className="text-sm text-gray-700">
                Belgische Gegevensbeschermingsautoriteit (APD/GBA)<br />
                Drukpersstraat 35, 1000 Brussel<br />
                <a href="https://www.autoriteprotectiondonnees.be" className="text-blue-600 hover:underline">autoriteprotectiondonnees.be</a>
              </p>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t">
          <p>© {new Date().getFullYear()} Caberu SRL. Alle rechten voorbehouden.</p>
          <p className="mt-2">
            <Link to="/terms" className="text-blue-600 hover:underline">Servicevoorwaarden</Link>
            {" • "}
            <Link to="/" className="text-blue-600 hover:underline">Home</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyNl;

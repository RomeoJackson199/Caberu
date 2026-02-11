import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Mail, Users, Database, Globe, AlertTriangle, Bell } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Link } from "react-router-dom";

const PrivacyPolicyFr = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header user={null} minimal />

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-blue-100">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Politique de Confidentialité</h1>
          <p className="text-gray-600">
            Date d'entrée en vigueur : 9 décembre 2025 | Dernière mise à jour : 9 décembre 2025
          </p>
        </div>

        {/* 1. Who We Are */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">1. Qui Sommes-Nous</h2>
          <Card className="p-6 bg-gray-50">
            <p className="font-semibold mb-2">Caberu SRL</p>
            <p className="text-gray-700">Hertogenweg 20, Belgique</p>
            <p className="text-gray-700">E-mail : <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
            <p className="text-gray-700">Site web : <a href="https://caberu.be" className="text-blue-600 hover:underline">https://caberu.be</a></p>
          </Card>
          <p className="text-gray-700 leading-relaxed">
            Caberu fournit une plateforme de gestion de cabinet dentaire alimentée par l'IA (« Service ») pour les cabinets dentaires à travers l'Union européenne.
          </p>
        </section>

        {/* 2. Our Role Under GDPR */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            2. Notre Rôle selon le RGPD
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Caberu agit dans <strong>deux rôles différents</strong> selon les données :
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">2.1 Responsable du Traitement</h3>
              <p className="text-sm text-gray-600 mb-2">(pour les Comptes de Cabinet Dentaire)</p>
              <p className="text-gray-700 text-sm">
                Lorsque vous (un cabinet dentaire) créez un compte avec Caberu, <strong>nous sommes le Responsable du Traitement</strong> pour vos informations professionnelles (nom du cabinet, comptes des dentistes, coordonnées, informations de facturation).
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">2.2 Sous-traitant</h3>
              <p className="text-sm text-gray-600 mb-2">(pour les Données de Santé des Patients)</p>
              <p className="text-gray-700 text-sm">
                Lorsque vous utilisez Caberu pour gérer les dossiers de santé de vos patients, <strong>vous (le cabinet dentaire) êtes le Responsable du Traitement</strong> et <strong>nous sommes le Sous-traitant</strong>. Nous traitons les données de santé des patients uniquement en votre nom.
              </p>
            </Card>
          </div>
        </section>

        {/* 3. What Data We Collect */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            3. Quelles Données Nous Collectons
          </h2>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.1 Pour les Cabinets Dentaires (lors de l'inscription)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Nom du cabinet et informations commerciales</li>
                <li>Noms des dentistes et titres professionnels</li>
                <li>Coordonnées (e-mail, téléphone, adresse)</li>
                <li>Informations de facturation et de paiement</li>
                <li>Identifiants de connexion (e-mail, mot de passe crypté)</li>
              </ul>
            </Card>

            <Card className="p-6 border-orange-200 bg-orange-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.2 Pour les Patients (Données de Santé - Catégorie Spéciale selon l'Article 9 du RGPD)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Informations personnelles (nom, date de naissance, coordonnées)</li>
                <li>Antécédents médicaux dentaires et conditions</li>
                <li>Dossiers de traitement et diagnostics</li>
                <li>Prescriptions et médicaments</li>
                <li>Historique des rendez-vous</li>
                <li>Notes cliniques et radiographies</li>
                <li>Informations d'assurance</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">3.3 Données Techniques (Collectées Automatiquement)</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Informations sur l'appareil (type de navigateur, système d'exploitation)</li>
                <li>Adresse IP et données de localisation</li>
                <li>Pages visitées et fonctionnalités utilisées</li>
                <li>Durée de session et cookies</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 4. Legal Basis for Processing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            4. Base Juridique du Traitement (Articles 6 et 9 du RGPD)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Type de Données</th>
                  <th className="border p-3 text-left">Base Juridique</th>
                  <th className="border p-3 text-left">Article RGPD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Données professionnelles du cabinet dentaire</td>
                  <td className="border p-3">Exécution du contrat</td>
                  <td className="border p-3">Art. 6(1)(b)</td>
                </tr>
                <tr className="bg-orange-50">
                  <td className="border p-3 font-medium">Données de santé des patients</td>
                  <td className="border p-3">Traitement pour le compte du Responsable + Consentement explicite</td>
                  <td className="border p-3">Art. 6(1)(b) + Art. 9(2)(a)</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Informations de paiement</td>
                  <td className="border p-3">Contrat + Obligation légale</td>
                  <td className="border p-3">Art. 6(1)(b) + Art. 6(1)(c)</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Analyses</td>
                  <td className="border p-3">Intérêt légitime + Consentement</td>
                  <td className="border p-3">Art. 6(1)(f) + Art. 6(1)(a)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Card className="p-4 bg-orange-50 border-orange-200">
            <p className="text-sm text-gray-700">
              <strong>Note Spéciale sur les Données de Santé :</strong> Les données de santé constituent une catégorie spéciale de données selon l'article 9 du RGPD. Nous les traitons uniquement avec le consentement explicite du patient ET pour le compte du cabinet dentaire (en tant que Sous-traitant).
            </p>
          </Card>
        </section>

        {/* 5. How We Use Your Data */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">5. Comment Nous Utilisons Vos Données</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">✅ Nous :</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✓ Fournissons et maintenons le Service</li>
                <li>✓ Créons et gérons les comptes de cabinets dentaires</li>
                <li>✓ Permettons la planification des rendez-vous</li>
                <li>✓ Stockons les dossiers de santé des patients</li>
                <li>✓ Traitons les paiements et la facturation</li>
                <li>✓ Envoyons des rappels de rendez-vous</li>
                <li>✓ Fournissons un support client</li>
                <li>✓ Améliorons notre Service</li>
                <li>✓ Respectons nos obligations légales</li>
              </ul>
            </Card>

            <Card className="p-6 bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-800 mb-3">❌ Nous NE :</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✗ Vendons pas vos données à des tiers</li>
                <li>✗ Utilisons pas les données de santé des patients à des fins de marketing</li>
                <li>✗ Partageons pas les données sauf comme décrit</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 6. Data Sharing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            6. Partage et Divulgation des Données
          </h2>

          <h3 className="text-lg font-semibold">6.1 Prestataires de Services (Sous-traitants ultérieurs)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Fournisseur</th>
                  <th className="border p-3 text-left">Objectif</th>
                  <th className="border p-3 text-left">Localisation</th>
                  <th className="border p-3 text-left">Garanties</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Supabase</td>
                  <td className="border p-3">Base de données & Authentification</td>
                  <td className="border p-3">UE</td>
                  <td className="border p-3">Conforme RGPD</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Google Analytics</td>
                  <td className="border p-3">Analyses du site web</td>
                  <td className="border p-3">UE & États-Unis</td>
                  <td className="border p-3">IP anonymisée</td>
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Stripe</td>
                  <td className="border p-3">Paiements</td>
                  <td className="border p-3">UE</td>
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
            7. Transferts Internationaux de Données
          </h2>
          <p className="text-gray-700 leading-relaxed">
            <strong>Toutes les données sont stockées au sein de l'Union européenne</strong> (région UE de Supabase). Google Analytics peut transférer des données d'analyse anonymisées vers les États-Unis, couvertes par les Clauses Contractuelles Types (CCT) et l'anonymisation de l'IP.
          </p>
        </section>

        {/* 8. Data Security */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            8. Sécurité des Données
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🔒 Chiffrement</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• TLS 1.3 en transit</li>
                <li>• AES-256 au repos</li>
                <li>• Hachage de mot de passe Bcrypt</li>
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-2">🔐 Contrôles d'Accès</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Sécurité au niveau des lignes</li>
                <li>• Authentification multi-facteurs</li>
                <li>• Délai d'expiration de session de 15 minutes</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 9. Data Retention */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">9. Conservation des Données</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Type de Données</th>
                  <th className="border p-3 text-left">Conservation</th>
                  <th className="border p-3 text-left">Raison</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3">Dossiers de santé des patients</td>
                  <td className="border p-3">30 ans</td>
                  <td className="border p-3">Loi belge sur les dossiers médicaux</td>
                </tr>
                <tr>
                  <td className="border p-3">Comptes de cabinet</td>
                  <td className="border p-3">Jusqu'à suppression + 90 jours</td>
                  <td className="border p-3">Fourniture du service</td>
                </tr>
                <tr>
                  <td className="border p-3">Dossiers de facturation</td>
                  <td className="border p-3">7 ans</td>
                  <td className="border p-3">Législation fiscale</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. Your Rights */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" />
            10. Vos Droits selon le RGPD
          </h2>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { right: "Droit d'Accès", article: "Art. 15", desc: "Demander une copie de vos données" },
              { right: "Droit de Rectification", article: "Art. 16", desc: "Corriger les données inexactes" },
              { right: "Droit à l'Effacement", article: "Art. 17", desc: "Demander la suppression de vos données" },
              { right: "Droit de Limitation du Traitement", article: "Art. 18", desc: "Limiter l'utilisation de vos données" },
              { right: "Droit à la Portabilité", article: "Art. 20", desc: "Recevoir les données en JSON/CSV" },
              { right: "Droit d'Opposition", article: "Art. 21", desc: "S'opposer au traitement" },
              { right: "Droit de Retrait du Consentement", article: "Art. 7(3)", desc: "Retirer le consentement à tout moment" },
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
              Comment Exercer Vos Droits
            </h3>
            <p className="text-sm text-gray-700">
              Connectez-vous à votre compte → Paramètres → Données et Confidentialité, ou envoyez un e-mail à <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a> avec « Demande de Données » en objet. Nous répondons dans un délai de <strong>30 jours</strong>.
            </p>
          </Card>
        </section>

        {/* 11. Data Breach */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            11. Notification de Violation de Données
          </h2>
          <p className="text-gray-700 leading-relaxed">
            En cas de violation de données, nous notifierons l'<strong>Autorité belge de Protection des Données dans les 72 heures</strong> (Art. 33 du RGPD) et les personnes concernées sans délai excessif si le risque est élevé (Art. 34 du RGPD).
          </p>
        </section>

        {/* 12. Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            12. Contact et Réclamations
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Délégué à la Protection des Données</h3>
              <p className="text-sm text-gray-700">
                E-mail : <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a><br />
                Objet : « Demande de Protection des Données »
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-2">Réclamations</h3>
              <p className="text-sm text-gray-700">
                Autorité belge de Protection des Données (APD/GBA)<br />
                Rue de la Presse 35, 1000 Bruxelles<br />
                <a href="https://www.autoriteprotectiondonnees.be" className="text-blue-600 hover:underline">autoriteprotectiondonnees.be</a>
              </p>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t">
          <p>© {new Date().getFullYear()} Caberu SRL. Tous droits réservés.</p>
          <p className="mt-2">
            <Link to="/terms" className="text-blue-600 hover:underline">Conditions d'Utilisation</Link>
            {" • "}
            <Link to="/" className="text-blue-600 hover:underline">Accueil</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyFr;

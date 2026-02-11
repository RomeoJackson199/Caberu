import { Card } from "@/components/ui/card";
import { Cookie, Shield, BarChart, Target, Settings } from "lucide-react";
import { Header } from "@/components/homepage/Header";
import { Footer } from "@/components/homepage/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CookiePolicyFr = () => {
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
          <h1 className="text-4xl font-bold text-gray-900">Politique de Cookies</h1>
          <p className="text-gray-600">
            Date d'entrée en vigueur : 11 février 2026 | Dernière mise à jour : 11 février 2026
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Cette Politique de Cookies explique comment Caberu SRL ("nous", "notre" ou "nos") utilise les cookies
            et technologies de suivi similaires sur notre site web <a href="https://caberu.be" className="text-blue-600 hover:underline">https://caberu.be</a>.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Nous respectons votre vie privée et nous nous engageons à être transparents sur les cookies que nous utilisons.
            Vous avez un contrôle total sur les cookies que vous acceptez.
          </p>
        </section>

        {/* What are Cookies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Qu'est-ce que les Cookies ?</h2>
          <p className="text-gray-700 leading-relaxed">
            Les cookies sont de petits fichiers texte stockés sur votre appareil (ordinateur, tablette ou mobile)
            lorsque vous visitez un site web. Ils aident les sites web à mémoriser vos préférences et à améliorer
            votre expérience de navigation.
          </p>
        </section>

        {/* Cookies We Use */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Cookies que Nous Utilisons</h2>

          {/* Essential Cookies */}
          <Card className="p-6 border-green-200 bg-green-50">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">1. Cookies Essentiels (Toujours Actifs)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Ces cookies sont nécessaires au fonctionnement du site web et ne peuvent pas être désactivés.
                  Ils permettent des fonctionnalités de base comme la connexion sécurisée, la gestion de session
                  et la navigation sur les pages.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">sb-auth-token</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Objectif :</strong> Authentification utilisateur et gestion de session</p>
                      <p><strong>Durée :</strong> Session (supprimé à la fermeture du navigateur)</p>
                      <p><strong>Fournisseur :</strong> Supabase (notre fournisseur d'authentification)</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">cookie-consent</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Objectif :</strong> Stocke vos préférences de cookies</p>
                      <p><strong>Durée :</strong> 1 an</p>
                      <p><strong>Fournisseur :</strong> Caberu</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800 mb-2">theme</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Objectif :</strong> Mémorise votre préférence de mode clair/sombre</p>
                      <p><strong>Durée :</strong> Persistant</p>
                      <p><strong>Fournisseur :</strong> Caberu</p>
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
                <h3 className="text-xl font-semibold text-gray-900">2. Cookies Analytiques (Optionnels)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Ces cookies nous aident à comprendre comment les visiteurs interagissent avec notre site web
                  en collectant des informations de manière anonyme. Ils nous aident à améliorer notre service
                  et à corriger les bugs.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_ga</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Objectif :</strong> Distingue les utilisateurs uniques pour Google Analytics</p>
                      <p><strong>Durée :</strong> 2 ans</p>
                      <p><strong>Fournisseur :</strong> Google Analytics</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_gid</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Objectif :</strong> Distingue les utilisateurs pour Google Analytics</p>
                      <p><strong>Durée :</strong> 24 heures</p>
                      <p><strong>Fournisseur :</strong> Google Analytics</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-800 mb-2">_ga_[container-id]</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Objectif :</strong> Persiste l'état de session pour Google Analytics 4</p>
                      <p><strong>Durée :</strong> 2 ans</p>
                      <p><strong>Fournisseur :</strong> Google Analytics 4</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                  <p className="text-sm text-gray-700">
                    <strong>Remarque :</strong> Nous utilisons l'anonymisation IP pour tous les cookies analytiques
                    afin de protéger votre vie privée. Aucune information personnellement identifiable n'est collectée
                    via les analyses.
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
                <h3 className="text-xl font-semibold text-gray-900">3. Cookies Marketing (Optionnels)</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Ces cookies suivent les visiteurs sur les sites web pour afficher des publicités pertinentes.
                  Actuellement, nous n'utilisons pas de cookies marketing. Cette section est réservée pour une
                  utilisation future.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* How to Control Cookies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Comment Contrôler les Cookies
          </h2>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Retirer Votre Consentement</h3>
            <p className="text-gray-700 text-sm mb-4">
              Vous pouvez modifier vos préférences de cookies à tout moment en cliquant sur le bouton ci-dessous.
              Cela effacera vos préférences actuelles et affichera à nouveau la bannière de cookies.
            </p>
            <Button onClick={handleWithdrawConsent} variant="outline">
              Modifier les Préférences de Cookies
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Paramètres du Navigateur</h3>
            <p className="text-gray-700 text-sm mb-3">
              Vous pouvez également contrôler les cookies via les paramètres de votre navigateur :
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>
                <strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies et autres données de site
              </li>
              <li>
                <strong>Firefox :</strong> Paramètres → Vie privée et sécurité → Cookies et données de site
              </li>
              <li>
                <strong>Safari :</strong> Préférences → Confidentialité → Cookies et données de site web
              </li>
              <li>
                <strong>Edge :</strong> Paramètres → Autorisations de cookies et de site → Cookies et données de site
              </li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              Remarque : Le blocage des cookies essentiels peut empêcher certaines parties du site web de fonctionner correctement.
            </p>
          </Card>
        </section>

        {/* Third-Party Services */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Services Tiers</h2>
          <p className="text-gray-700 leading-relaxed">
            Nous utilisons les services tiers suivants qui peuvent définir des cookies :
          </p>
          <Card className="p-6">
            <ul className="space-y-3 text-sm text-gray-700">
              <li>
                <strong>Google Analytics 4 :</strong> Analyse du trafic du site web et informations sur le comportement des utilisateurs
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Politique de confidentialité : <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>
                </div>
              </li>
              <li>
                <strong>Google Tag Manager :</strong> Système de gestion des balises pour l'analyse
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Politique de confidentialité : <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a>
                </div>
              </li>
              <li>
                <strong>Supabase :</strong> Services backend incluant l'authentification et la base de données
                <div className="ml-4 mt-1 text-xs text-gray-600">
                  Politique de confidentialité : <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a>
                </div>
              </li>
            </ul>
          </Card>
        </section>

        {/* Updates to This Policy */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Mises à Jour de cette Politique</h2>
          <p className="text-gray-700 leading-relaxed">
            Nous pouvons mettre à jour cette Politique de Cookies de temps en temps pour refléter les changements
            dans nos pratiques ou pour des raisons légales. La date de "Dernière mise à jour" en haut indiquera
            quand les modifications ont été apportées.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Nous Contacter</h2>
          <Card className="p-6 bg-gray-50">
            <p className="text-gray-700 mb-3">
              Si vous avez des questions sur cette Politique de Cookies ou notre utilisation des cookies, veuillez nous contacter :
            </p>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Caberu SRL</strong></p>
              <p>Hertogenweg 20, Belgique</p>
              <p>Email : <a href="mailto:Romeo@caberu.be" className="text-blue-600 hover:underline">Romeo@caberu.be</a></p>
            </div>
          </Card>
        </section>

        {/* Related Policies */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Politiques Connexes</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/fr/privacy">
              <Button variant="outline" size="sm">Politique de Confidentialité</Button>
            </Link>
            <Link to="/terms">
              <Button variant="outline" size="sm">Conditions d'Utilisation</Button>
            </Link>
            <Link to="/dpa">
              <Button variant="outline" size="sm">Accord de Traitement des Données</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicyFr;

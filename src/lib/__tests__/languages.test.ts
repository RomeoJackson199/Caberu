/**
 * Tests for languages.ts - Language and translation utilities
 */

import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  TRANSLATIONS,
  getTranslation,
  getSupportedLanguages,
  isValidLanguage,
} from '../languages';

describe('languages.ts', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('should include English', () => {
      expect(SUPPORTED_LANGUAGES.en).toBeDefined();
      expect(SUPPORTED_LANGUAGES.en.code).toBe('en');
      expect(SUPPORTED_LANGUAGES.en.name).toBe('English');
    });

    it('should include French', () => {
      expect(SUPPORTED_LANGUAGES.fr).toBeDefined();
      expect(SUPPORTED_LANGUAGES.fr.code).toBe('fr');
      expect(SUPPORTED_LANGUAGES.fr.name).toBe('Français');
    });

    it('should include Dutch', () => {
      expect(SUPPORTED_LANGUAGES.nl).toBeDefined();
      expect(SUPPORTED_LANGUAGES.nl.code).toBe('nl');
      expect(SUPPORTED_LANGUAGES.nl.name).toBe('Nederlands');
    });

    it('should have LTR direction for all languages', () => {
      Object.values(SUPPORTED_LANGUAGES).forEach(lang => {
        expect(lang.direction).toBe('ltr');
      });
    });

    it('should have flags for all languages', () => {
      expect(SUPPORTED_LANGUAGES.en.flag).toBeTruthy();
      expect(SUPPORTED_LANGUAGES.fr.flag).toBeTruthy();
      expect(SUPPORTED_LANGUAGES.nl.flag).toBeTruthy();
    });
  });

  describe('DEFAULT_LANGUAGE', () => {
    it('should be English', () => {
      expect(DEFAULT_LANGUAGE).toBe('en');
    });
  });

  describe('TRANSLATIONS', () => {
    it('should have translations for all supported languages', () => {
      expect(TRANSLATIONS.en).toBeDefined();
      expect(TRANSLATIONS.fr).toBeDefined();
      expect(TRANSLATIONS.nl).toBeDefined();
    });

    describe('English translations', () => {
      const en = TRANSLATIONS.en;

      it('should have navigation translations', () => {
        expect(en.dashboard).toBe('Dashboard');
        expect(en.appointments).toBe('Appointments');
        expect(en.patients).toBe('Patients');
        expect(en.settings).toBe('Settings');
        expect(en.profile).toBe('Profile');
        expect(en.logout).toBe('Logout');
      });

      it('should have common action translations', () => {
        expect(en.save).toBe('Save');
        expect(en.cancel).toBe('Cancel');
        expect(en.delete).toBe('Delete');
        expect(en.edit).toBe('Edit');
        expect(en.view).toBe('View');
        expect(en.add).toBe('Add');
      });

      it('should have appointment-related translations', () => {
        expect(en.bookAppointment).toBe('Book Appointment');
        expect(en.appointmentDate).toBe('Appointment Date');
        expect(en.appointmentTime).toBe('Appointment Time');
        expect(en.confirmBooking).toBe('Confirm Booking');
      });

      it('should have status translations', () => {
        expect(en.loading).toBe('Loading...');
        expect(en.error).toBe('Error');
        expect(en.success).toBe('Success');
      });

      it('should have day translations', () => {
        expect(en.monday).toBe('Monday');
        expect(en.tuesday).toBe('Tuesday');
        expect(en.wednesday).toBe('Wednesday');
        expect(en.thursday).toBe('Thursday');
        expect(en.friday).toBe('Friday');
        expect(en.saturday).toBe('Saturday');
        expect(en.sunday).toBe('Sunday');
      });
    });

    describe('French translations', () => {
      const fr = TRANSLATIONS.fr;

      it('should have navigation translations', () => {
        expect(fr.dashboard).toBe('Tableau de Bord');
        expect(fr.appointments).toBe('Rendez-vous');
        expect(fr.patients).toBe('Patients');
        expect(fr.settings).toBe('Paramètres');
        expect(fr.logout).toBe('Déconnexion');
      });

      it('should have common action translations', () => {
        expect(fr.save).toBe('Enregistrer');
        expect(fr.cancel).toBe('Annuler');
        expect(fr.delete).toBe('Supprimer');
        expect(fr.confirm).toBe('Confirmer');
      });

      it('should have day translations', () => {
        expect(fr.monday).toBe('Lundi');
        expect(fr.tuesday).toBe('Mardi');
        expect(fr.wednesday).toBe('Mercredi');
        expect(fr.thursday).toBe('Jeudi');
        expect(fr.friday).toBe('Vendredi');
        expect(fr.saturday).toBe('Samedi');
        expect(fr.sunday).toBe('Dimanche');
      });
    });

    describe('Dutch translations', () => {
      const nl = TRANSLATIONS.nl;

      it('should have navigation translations', () => {
        expect(nl.dashboard).toBe('Dashboard');
        expect(nl.appointments).toBe('Afspraken');
        expect(nl.patients).toBe('Patiënten');
        expect(nl.settings).toBe('Instellingen');
        expect(nl.logout).toBe('Uitloggen');
      });

      it('should have common action translations', () => {
        expect(nl.save).toBe('Opslaan');
        expect(nl.cancel).toBe('Annuleren');
        expect(nl.delete).toBe('Verwijderen');
        expect(nl.confirm).toBe('Bevestigen');
      });

      it('should have day translations', () => {
        expect(nl.monday).toBe('Maandag');
        expect(nl.tuesday).toBe('Dinsdag');
        expect(nl.wednesday).toBe('Woensdag');
        expect(nl.thursday).toBe('Donderdag');
        expect(nl.friday).toBe('Vrijdag');
        expect(nl.saturday).toBe('Zaterdag');
        expect(nl.sunday).toBe('Zondag');
      });
    });

    it('should have consistent keys across all languages', () => {
      const enKeys = Object.keys(TRANSLATIONS.en).filter(k => typeof TRANSLATIONS.en[k as keyof typeof TRANSLATIONS.en] === 'string');
      const frKeys = Object.keys(TRANSLATIONS.fr).filter(k => typeof TRANSLATIONS.fr[k as keyof typeof TRANSLATIONS.fr] === 'string');
      const nlKeys = Object.keys(TRANSLATIONS.nl).filter(k => typeof TRANSLATIONS.nl[k as keyof typeof TRANSLATIONS.nl] === 'string');

      // Most keys should exist in all languages
      const commonKeys = ['dashboard', 'appointments', 'patients', 'settings', 'save', 'cancel'];
      commonKeys.forEach(key => {
        expect(enKeys).toContain(key);
        expect(frKeys).toContain(key);
        expect(nlKeys).toContain(key);
      });
    });
  });

  describe('getTranslation', () => {
    it('should return English translation by default', () => {
      expect(getTranslation('dashboard')).toBe('Dashboard');
      expect(getTranslation('save')).toBe('Save');
    });

    it('should return English translation when specified', () => {
      expect(getTranslation('appointments', 'en')).toBe('Appointments');
    });

    it('should return French translation when specified', () => {
      expect(getTranslation('appointments', 'fr')).toBe('Rendez-vous');
    });

    it('should return Dutch translation when specified', () => {
      expect(getTranslation('appointments', 'nl')).toBe('Afspraken');
    });

    it('should return the key if translation not found', () => {
      expect(getTranslation('nonexistent_key', 'en')).toBe('nonexistent_key');
    });

    it('should fall back to default language for unknown language', () => {
      expect(getTranslation('dashboard', 'de')).toBe('Dashboard');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of language configs', () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBe(3);
    });

    it('should include all supported languages', () => {
      const languages = getSupportedLanguages();
      const codes = languages.map(l => l.code);

      expect(codes).toContain('en');
      expect(codes).toContain('fr');
      expect(codes).toContain('nl');
    });

    it('should return complete language objects', () => {
      const languages = getSupportedLanguages();

      languages.forEach(lang => {
        expect(lang.code).toBeDefined();
        expect(lang.name).toBeDefined();
        expect(lang.flag).toBeDefined();
        expect(lang.direction).toBeDefined();
      });
    });
  });

  describe('isValidLanguage', () => {
    it('should return true for supported languages', () => {
      expect(isValidLanguage('en')).toBe(true);
      expect(isValidLanguage('fr')).toBe(true);
      expect(isValidLanguage('nl')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isValidLanguage('de')).toBe(false);
      expect(isValidLanguage('es')).toBe(false);
      expect(isValidLanguage('it')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isValidLanguage('')).toBe(false);
      expect(isValidLanguage('invalid')).toBe(false);
    });
  });

  describe('Patient navigation translations', () => {
    it('should have pnav structure in English', () => {
      const pnav = TRANSLATIONS.en.pnav;
      expect(pnav.home.label).toBe('Home');
      expect(pnav.care.label).toBe('Care');
      expect(pnav.billing.label).toBe('Billing');
      expect(pnav.account.label).toBe('Account');
    });

    it('should have pnav structure in French', () => {
      const pnav = TRANSLATIONS.fr.pnav;
      expect(pnav.home.label).toBe('Accueil');
      expect(pnav.care.label).toBe('Soins');
      expect(pnav.billing.label).toBe('Facturation');
      expect(pnav.account.label).toBe('Compte');
    });

    it('should have pnav structure in Dutch', () => {
      const pnav = TRANSLATIONS.nl.pnav;
      expect(pnav.home.label).toBe('Home');
      expect(pnav.care.label).toBe('Zorg');
      expect(pnav.billing.label).toBe('Facturering');
      expect(pnav.account.label).toBe('Account');
    });

    it('should have nested care section', () => {
      const care = TRANSLATIONS.en.pnav.care;
      expect(care.health).toBe('Health');
      expect(care.appointments).toBe('Appointments');
      expect(care.prescriptions).toBe('Prescriptions');
      expect(care.documents).toBe('Documents');
    });

    it('should have nested account section', () => {
      const account = TRANSLATIONS.en.pnav.account;
      expect(account.profile).toBe('Profile');
      expect(account.insurance).toBe('Insurance');
      expect(account.privacy).toBe('Privacy');
      expect(account.help).toBe('Help');
    });
  });
});

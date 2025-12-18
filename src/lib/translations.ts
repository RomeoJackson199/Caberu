
export type Language = "en" | "fr" | "nl";

export const SUPPORTED_LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
];

export interface Translations {
    // Error & status messages
    error: string;
    success: string;
    microphoneAccessError: string;
    transcriptionFailed: string;
    voiceProcessingError: string;
    // General
    settings: string;
    general: string;
    theme: string;
    personal: string;
    startConsultation: string;
    emergencyAssistance: string;
    language: string;
    patientPortal: string;
    classicBooking: string;
    clinicLogoAlt: string;
    openMenu: string;
    collapseExpandSidebar: string;
    toggleSidebar: string;
    light: string;
    dark: string;
    save: string;
    confirm: string;
    cancel: string;
    close: string;
    retry: string;

    // Booking & schedule additions
    selectDentist: string;
    selectAppointmentType: string;
    appointmentType: string;
    confirmBooking: string;
    booking: string;
    bookAppointmentDescription: string;
    describeSymptoms: string;
    noSlotsAvailable: string;
    unableToLoadSlots: string;
    unableToBookAppointment: string;
    pleaseCompleteAllFields: string;
    incompleteProfile: string;
    pleaseCompleteProfileFirst: string;
    appointmentBooked: string;
    weeklyAvailability: string;
    workingHours: string;
    breakTime: string;
    saveAvailability: string;
    availabilityUpdated: string;
    failedToLoadAvailability: string;
    failedToSaveAvailability: string;
    saving: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;

    // Vacation & Schedule Management
    availabilityManagement: string;
    weeklySchedule: string;
    vacationsAbsences: string;
    weeklyPlanning: string;
    quickPresets: string;
    presetMonFri: string;
    presetMonSat: string;
    startTime: string;
    endTime: string;
    breakStart: string;
    breakEnd: string;
    addVacation: string;
    startDate: string;
    endDate: string;
    vacationType: string;
    scheduledVacations: string;
    loadingSettings: string;
    vacationsTypeVacation: string;
    vacationsTypeSick: string;
    vacationsTypePersonal: string;
    addButton: string;
    noVacationsScheduled: string;
    deleteVacation: string;
    day: string;
    days: string;

    // Personal Info
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: string;
    medicalHistory: string;
    personalInformation: string;
    savePersonalInfo: string;
    address: string;
    emergencyContact: string;
    enterAddress: string;
    enterEmergencyContact: string;

    // Messages
    languageUpdated: string;
    languageChangedTo: string;
    themeUpdated: string;
    switchedToMode: string;
    personalInfoSaved: string;
    personalInfoUpdated: string;
    informationConfirmed: string;
    changesSaved: string;
    privacyNotice: string;
    consentHealthData: string;
    childConsentNote: string;
    downloadMyData: string;
    deleteAccount: string;
    deleteAccountConfirm: string;
    aiAdviceDisclaimer: string;
    myProfile: string;
    about: string;

    // Auth
    signOut: string;
    signIn: string;
    signUp: string;
    createAccount: string;
    email: string;
    password: string;
    phone: string;
    optional: string;
    welcome: string;
    accessCaberu: string;
    signInOrCreate: string;
    signInButton: string;
    createAccountButton: string;
    accountCreatedSuccess: string;
    checkEmailConfirm: string;
    signUpError: string;
    signInError: string;
    signInSuccess: string;
    welcomeToCaberu: string;

    // Placeholders
    enterFirstName: string;
    enterLastName: string;
    enterPhoneNumber: string;
    enterMedicalHistory: string;
    selectLanguage: string;
    enterEmail: string;
    enterPassword: string;

    // Dental Chat
    dentalAssistant: string;
    typeMessage: string;
    send: string;
    welcomeMessage: string;
    detailedWelcomeMessage: string;
    detailedWelcomeMessageWithName: (name: string) => string;

    // Landing page
    intelligentDentalAssistant: string;
    experienceFuture: string;
    viewOurDentists: string;
    aiDiagnosis: string;
    aiDiagnosisDesc: string;
    smartBooking: string;
    smartBookingDesc: string;
    support24_7: string;
    support24_7Desc: string;
    initializingExperience: string;
    preparingAssistant: string;

    // Navigation
    chat: string;
    appointments: string;

    // Appointment booking
    bookAppointment: string;
    bookConsultationDescription: string;
    chooseDentist: string;
    selectDate: string;
    selectTime: string;
    availableSlots: string;
    consultationReason: string;
    generalConsultation: string;
    routineCheckup: string;
    dentalPain: string;
    emergency: string;
    cleaning: string;
    other: string;
    bookNow: string;
    appointmentConfirmed: string;
    errorTitle: string;
    cannotLoadSlots: string;
    cannotLoadDentists: string;
    missingInformation: string;
    selectDentistDateTime: string;
    slotNoLongerAvailable: string;
    cannotCreateAppointment: string;

    // Appointments list
    myAppointments: string;
    appointmentHistory: string;
    upcomingAppointments: string;
    pastAppointments: string;
    newAppointment: string;
    appointmentDetails: string;
    loading: string;
    noUpcomingAppointments: string;
    noPastAppointments: string;
    noAppointmentsFound: string;
    viewMore: string;
    showLess: string;
    more: string;
    reschedule: string;
    cancelAppointment: string;
    confirmCancellation: string;
    confirmCancellationMessage: string;
    keepAppointment: string;
    yesCancelAppointment: string;
    appointmentCancelled: string;
    failedToCancelAppointment: string;

    // Appointments Management
    appointmentsManagement: string;
    manageViewAppointments: string;
    refresh: string;
    searchByPatient: string;
    todayPlus7Days: string;
    nextWeek: string;
    nextMonth: string;
    allTime: string;
    thisWeek: string;
    thisMonth: string;
    allStatus: string;
    pending: string;
    time: string;
    patient: string;
    status: string;
    actions: string;
    view: string;
    notRegisteredDentist: string;
    contactSupport: string;
    todaysAppointments: string;
    urgentCases: string;
    completionRate: string;
    highPriority: string;
    estimatedRevenue: string;
    avg: string;
    statusOverview: string;
    generalConsultationLower: string;

    // Chat commands & integration
    showMyAppointments: string;
    nextAppointment: string;
    suggestedTime: (dentist: string, time: string) => string;
    wouldYouLikeToBook: string;
    seeOtherOptions: string;
    appointmentSuggestion: (
        dentist: string,
        date: string,
        time: string,
    ) => string;
    bookThisSlot: string;
    showOtherTimes: string;
    settingsUpdated: string;
    preferencesChanged: string;

    // Error handling
    microphoneError: string;
    cameraError: string;
    mediaAccessDenied: string;
    mediaNotSupported: string;
    tryAgain: string;

    // Privacy & validation
    privacyPolicyLink: string;
    dataHandlingInfo: string;
    invalidPhoneFormat: string;
    invalidEmailFormat: string;
    requiredField: string;

    // Onboarding
    welcomeToFirstSmile: string;
    yourAIDentalAssistant: string;
    onboardingIntro: string;
    smartFeaturesService: string;
    aiChat: string;
    aiChatDesc: string;
    photoAnalysis: string;
    photoAnalysisDesc: string;
    familyCare: string;
    familyCareDesc: string;
    bookForFamilyTitle: string;
    familyFriendlyBooking: string;
    bookForYourself: string;
    bookForChildren: string;
    bookForFamily: string;
    alwaysTellDuration: string;
    readyToStart: string;
    youreAllSet: string;
    onboardingEnd: string;
    proTip: string;
    proTipText: string;
    letsStart: string;
    next: string;
    back: string;
    previewNotice: string;
    aiDisclaimer: string;
    acceptTerms: string;
    viewTerms: string;
    termsTitle: string;
    termsIntro: string;
    termsUse: string;
    termsPrivacy: string;
    termsMedical: string;

    // Language selection
    selectPreferredLanguage: string;
    languageSelectionDescription: string;

    // Emergency Triage
    'triage.title': string;
    'triage.subtitle': string;
    'triage.pain.title': string;
    'triage.pain.question': string;
    'triage.pain.none': string;
    'triage.pain.severe': string;
    'triage.symptoms.title': string;
    'triage.symptoms.bleeding': string;
    'triage.symptoms.swelling': string;
    'triage.symptoms.fever': string;
    'triage.symptoms.difficulty': string;
    'triage.symptoms.trauma': string;
    'triage.duration.title': string;
    'triage.duration.question': string;
    'triage.duration.hours': string;
    'triage.duration.day': string;
    'triage.duration.days': string;
    'triage.duration.week': string;
    'triage.medical.title': string;
    'triage.medical.diabetes': string;
    'triage.medical.heart': string;
    'triage.medical.blood': string;
    'triage.medical.immune': string;
    'triage.submit': string;
    'triage.result.emergency': string;
    'triage.result.high': string;
    'triage.result.medium': string;
    'triage.result.low': string;

    // Booking Triage
    'booking.title': string;
    'booking.earliest': string;
    'booking.confirm': string;
    'booking.success': string;
    'booking.detailsTitle': string;
    'booking.dentist': string;
    'booking.date': string;
    'booking.time': string;
    'booking.urgency': string;
    'booking.urgentArrivalNotice': string;
    'booking.continue': string;
    'booking.selectDate': string;
    'booking.availableTimes': string;
    'booking.noSlots': string;
    'booking.selectDatePrompt': string;
    'booking.selectedDentist': string;
    'booking.selectedBadge': string;

    // Emergency Triage Entry
    'entry.heroTitle': string;
    'entry.heroDesc': string;
    'entry.ctaStart': string;
    'entry.steps.assessSymptoms.title': string;
    'entry.steps.assessSymptoms.desc': string;
    'entry.steps.getUrgency.title': string;
    'entry.steps.getUrgency.desc': string;
    'entry.steps.viewSlots.title': string;
    'entry.steps.viewSlots.desc': string;
    'entry.steps.bookInstantly.title': string;
    'entry.steps.bookInstantly.desc': string;
    'entry.emergencyNotice.title': string;
    'entry.emergencyNotice.desc': string;
    'entry.gdpr.title': string;
    'entry.gdpr.desc': string;
    'entry.return': string;
    'entry.stats.minutes': string;
    'entry.stats.quick': string;
    'entry.stats.gdpr': string;
    'entry.stats.secure': string;
    'entry.stats.directBooking': string;
    'entry.stats.noChat': string;

    // Appointment Details Dialog
    appointmentDetailsTitle: string;
    appointmentInformation: string;
    urgency: string;
    reason: string;
    completed: string;
    notes: string;
    consultationNotes: string;
    additionalNotes: string;
    medicalRecords: string;
    prescriptions: string;
    billingInformation: string;
    findings: string;
    recommendations: string;
    prescribed: string;
    invoice: string;
    download: string;
    patientAmount: string;
    vat: string;
    total: string;
    created: string;
    failedToLoadDetails: string;

    // Patient Dashboard Components  
    goodMorning: string;
    goodAfternoon: string;
    goodEvening: string;
    hereIsYourHealthOverview: string;
    confirmed: string;
    join: string;
    activeMedications: string;
    viewInCareTab: string;
    balance: string;
    due: string;
    amountDue: string;
    allPaid: string;
    payNow: string;
    aiAssistant: string;
    getInstantHelpWith: string;
    bookingAppointments: string;
    dentalQuestions: string;
    emergencyTriage: string;
    startChat: string;
    dailyTipsReminders: string;
    morningReminder: string;
    dontForgetToBrush: string;
    healthTip: string;
    flossingDaily: string;
    upcoming: string;
    past: string;
    book: string;
    dentalCleaningRecommended: string;
    healthRecords: string;
    rewards: string;
    quicklyBookViewRecords: string;
    yourTreatmentsWillAppear: string;
    unpaid: string;
    paid: string;
    statements: string;
    paidInvoices: string;
    downloadStatements: string;
    viewManageMedications: string;
    upload: string;
    shareLink: string;
    insuranceProvider: string;
    insuranceProviderPlaceholder: string;
    policyNumber: string;
    policyNumberPlaceholder: string;
    healthStats: string;
    healthRating: string;
    excellent: string;
    visitsThisYear: string;
    onTrack: string;
    coverageUsed: string;
    remaining: string;
    healthImproved: string;
    lastSixMonths: string;
    treatmentPlans: string;
    manageDentalVisits: string;
    bookNew: string;
    active: string;
    mainClinic: string;
    generalCheckup: string;
    today: string;
    calendar: string;
    list: string;
    history: string;
    cancelled: string;
    scheduled: string;

    // Dentist Dashboard
    loadingDentistDashboard: string;
    notRegisteredAsDentist: string;
    dentiDashboard: string;
    dentistPortal: string;
    loadingDentistProfile: string;
    // AppShell & Navigation
    navClinical: string;
    navBusiness: string;
    navOperations: string;
    navAdmin: string;
    navDashboard: string;
    navAppointments: string;
    navPatients: string;
    navPayments: string;
    navAnalytics: string;
    navInventory: string;
    navImport: string;
    navSchedule: string;
    navSettings: string;
    navReports: string;
    navBrandingLoc: string;
    navSecurity: string;
    topSearch: string;
    topClinic: string;
    topProfile: string;

    // Patient portal navigation (pnav.*)
    pnav: {
        group: {
            care: string;
            billing: string;
            documents: string;
            account: string;
        };
        care: {
            home: string;
            appointments: string;
            prescriptions: string;
            history: string;
        };
        billing: {
            main: string;
        };
        docs: {
            main: string;
        };
        account: {
            profile: string;
            insurance: string;
            privacy: string;
            help: string;
        };
    };

    // Settings pages
    profile: string;
    services: string;
    hours: string;
    appts: string;
    team: string;
    brand: string;
    billing: string;
    security: string;
    scheduleAvailability: string;
    appointmentPreferences: string;
    requireApprovalBefore: string;
    approveNewPatientRequests: string;
    manualReviewRequired: string;
    requestsAutoConfirmed: string;
    saveChanges: string;
    savingChanges: string;
    saveImmediately: string;
    staffManagement: string;
    manageTeamMembers: string;
    dangerZone: string;
    irreversibleActions: string;
    leaveClinic: string;
    loseAccessWarning: string;
    lastMemberWarning: string;
    leaveClinicConfirm: string;
    enterPasswordConfirm: string;
    yourPassword: string;
    leaving: string;
    businessDeleted: string;
    lastMemberDeletedDesc: string;
    leftClinic: string;
    stillBelongOther: string;
    leftRoleRemoved: string;
    passwordRequired: string;
    enterPasswordLeave: string;
    couldntLoadSettings: string;
    refreshOrTryAgain: string;
    couldntSaveSettings: string;
    appointmentRulesUpdated: string;
    rulesUpdatedDesc: string;
    loadingPortal: string;
    accessDenied: string;
    startTour: string;
    reportsComingSoon: string;
    sectionNotFound: string;
    clinicalNotAvailable: string;
    paymentNotAvailable: string;

    // Branding page
    brandingSettings: string;
    brandingSubtitle: string;
    branding: string;
    aiAssistantConfig: string;
    templates: string;
    emailTemplates: string;
    payments: string;
    clinicInformation: string;
    businessLinkQr: string;
    uploadLogo: string;
    logoUploadDesc: string;
    chooseLogo: string;
    logoUploaded: string;
    logoUploadedDesc: string;
    invalidFile: string;
    uploadImageFile: string;
    fileTooLarge: string;
    logoSizeLimit: string;
    uploadFailed: string;
    clinicName: string;
    tagline: string;
    businessSlug: string;
    slugCannotContain: string;
    forwardSlashes: string;
    spaces: string;
    onlyOneDot: string;
    copyLink: string;
    linkCopied: string;
    linkCopiedDesc: string;
    failedToCopy: string;
    couldNotCopyLink: string;
    showQrCode: string;
    downloadQr: string;
    qrDownloaded: string;
    qrDownloadedDesc: string;
    downloadFailed: string;
    qrDownloadFailed: string;
    settingsSaved: string;
    settingsSavedDesc: string;
    templateSwitched: string;
    templateSwitchedDesc: string;
    template: string;
    saveFailed: string;
    businessTemplate: string;
    changeTemplate: string;
    templateWarning: string;
    confirmTemplateChange: string;
    testAi: string;

    // Security page
    securityAccess: string;
    securitySubtitle: string;
    changePassword: string;
    changePasswordDesc: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    enterCurrentPassword: string;
    enterNewPasswordMin: string;
    confirmPasswordPlaceholder: string;
    updatePassword: string;
    updating: string;
    passwordsDontMatch: string;
    passwordsDontMatchDesc: string;
    passwordTooShort: string;
    passwordMinLength: string;
    passwordUpdated: string;
    passwordUpdatedDesc: string;
    twoFactorAuth: string;
    twoFactorAuthDesc: string;
    enable2fa: string;
    require2faCode: string;
    twoFaDisabled: string;
    twoFaDisabledDesc: string;
    twoFaEnabled: string;
    staffRoles: string;
    staffRolesDesc: string;
    noStaffYet: string;
    dataPrivacy: string;
    dataPrivacyDesc: string;
    exportYourData: string;
    exportDataDesc: string;
    exportData: string;
    exporting: string;
    exportStarted: string;
    exportStartedDesc: string;
    exportFailed: string;
    deleteYourAccount: string;
    deleteAccountDesc: string;
    deleteAccountWarningDesc: string;
    confirmDeleteAccount: string;
    deleting: string;
    accountDeleted: string;
    accountDeletedDesc: string;
    deleteFailed: string;

    // Users page
    teamMembers: string;
    teamMembersDesc: string;
    totalUsers: string;
    activeUsers: string;
    pendingInvites: string;
    admins: string;
    userList: string;
    userListDesc: string;
    searchByNameEmailRole: string;
    name: string;
    roles: string;
    joined: string;
    noUsersFound: string;
    noRolesAssigned: string;
    invitationPending: string;
    inactive: string;

    // Profile page
    profileInformation: string;
    profileInfoDesc: string;
    specialization: string;
    specializationPlaceholder: string;
    clinicAddress: string;
    clinicAddressPlaceholder: string;
    professionalBio: string;
    bioPlaceholder: string;
    profileUpdated: string;

    // Dentist: Clinical appointment UI
    completeAppointment: string;
    prescriptionsShort: string;
    paymentsShort: string;
    viewAll: string;
    collapse: string;
    expand: string;
    srAlertNew: string;
    srQuickActions: string;

    // Treatment records
    searchTreatments: string;
    filterByType: string;
    allTypes: string;
    consultation: string;
    treatment: string;
    xray: string;
    labResult: string;
    dentist: string;
    treatmentType: string;
    date: string;
    noRecordsFound: string;
    appointmentRescheduled: string;
    savedSuccessfully: string;

    // Dashboard & Portal
    todaysSchedule: string;
    completedThisWeek: string;
    noAppointmentsToday: string;
    noAppointmentsTodayDesc: string;
    viewAllAppointments: string;
    scheduleNew: string;
    unknownPatient: string;
    urgent: string;
    noReasonSpecified: string;

    // Messages Page
    signInToMessage: string;
    needSignedInToMessage: string;
    selectConversation: string;

    // Patient Management
    selectPatient: string;
    findPatient: string;
    addNewPatient: string;
    overview: string;
    clinical: string;
    schedule: string;
    financial: string;
    years: string;
    yearsOld: string;
    medicalAlert: string;
    unpaidBalance: string;
    quickActions: string;
    createPayment: string;
    addTreatmentPlan: string;
    addQuickNote: string;
    exportPdf: string;
    searchNotesAppointmentsTreatments: string;
    patientTimeline: string;
    noPatientsYet: string;
    appointmentCompleted: string;
    appointmentCancelledToast: string;
    patientNotifiedByEmail: string;
    appointmentConfirmedToast: string;
    noteAdded: string;
    treatmentPlanCreated: string;
    treatmentPlanDeleted: string;
    clickUndoToRestore: string;
    appointmentDeleted: string;
    noteDeleted: string;
    treatmentPlanRestored: string;
    appointmentRestored: string;
    noteRestored: string;
    appointmentLinked: string;
    linkedTo: string;
    noEmail: string;
    patientHasNoEmail: string;
    patientUpdated: string;
    enterTitle: string;
    failedToCreateTreatmentPlan: string;
    failedToUpdatePatient: string;
    failedToDeleteTreatmentPlan: string;
    failedToDeleteAppointment: string;
    failedToDeleteNote: string;
    failedToRestoreTreatmentPlan: string;
    failedToRestoreAppointment: string;
    failedToRestoreNote: string;
    failedToLinkAppointment: string;
    failedToAddNote: string;
    deleteTreatmentPlan: string;
    deleteAppointment: string;
    confirmDeleteTreatmentPlan: string;
    confirmDeleteAppointment: string;
    confirmDeleteSelected: string;
    itemsDeleted: string;
    undo: string;

    // Payment page
    paymentCancelled: string;
    paymentCancelledMessage: string;
    closeWindow: string;

    // Billing empty states
    billingNotAvailable: string;
    billingNotAvailableDesc: string;
    goToCareHome: string;
    noPaidInvoices: string;
    noPaidInvoicesDesc: string;
    viewUnpaid: string;
    noStatementsAvailable: string;
    noStatementsDesc: string;
    managePaymentsDesc: string;
    amountDueLabel: string;

    // New appointment action translations
    noAppointmentsYet: string;
    bookFirstAppointment: string;
    confirmReschedule: string;
    rescheduleAppointment: string;
    newDate: string;
    newTime: string;
    bookNewAppointment: string;
    selectAPatient: string;
    reasonForVisit: string;
    durationMinutes: string;
    fillRequiredFields: string;
    appointmentBookedDesc: string;
    cancelAppointmentTitle: string;
    cancelAppointmentConfirm: string;
    goBack: string;
    all: string;

    // Availability settings (unique)
    availabilitySettings: string;
    manageWorkingHours: string;
    loadingAvailability: string;
    failedToFetchAvailability: string;
    quickSchedulePresets: string;
    standardWeek: string;
    standardWeekDesc: string;
    extendedHours: string;
    extendedHoursDesc: string;
    partTime: string;
    partTimeDesc: string;
    presetApplied: string;
    scheduleApplied: string;
    saveSettings: string;
    workingDays: string;
    totalHoursWeek: string;
    currentStatus: string;
    available: string;
    unavailable: string;
    makeAllDaysAvailable: string;
    makeAllDaysUnavailable: string;
    weekdaysOnly: string;
    weekendsOnly: string;
    availabilitySaved: string;
    failedToSave: string;

    // Schedule block labels
    breakLabel: string;
    sickLeaveLabel: string;
    vacationLabel: string;
    unavailableLabel: string;
    dayOff: string;
    beforeHours: string;
    afterHours: string;
    lunchBreak: string;
    timeOff: string;

    // Common
    'common.cancel': string;
    'common.next': string;
    'common.back': string;
    'common.loading': string;
    'common.success': string;

    // Top bar / Navigation
    logOut: string;
    failedToSignOut: string;
    dentalPortal: string;
    provider: string;

    // Next Appointment Widget
    viewDetails: string;
    complete: string;

    // Patient Management Page (new keys only)
    searchNotesAppointments: string;
    timeline: string;
    select: string;
    delete: string;
    patientScore: string;
    appointmentAttendance: string;
    noBalance: string;
    outstandingBalance: string;
    needsFollowup: string;
    treatmentProgress: string;
    noActiveTreatmentPlans: string;
    createPlan: string;
    totalVisits: string;
    lastVisit: string;
    never: string;
    daysAgo: string;
    balanceDue: string;
    addNote: string;
    treatmentPlan: string;
    scheduleNow: string;
    recentActivity: string;
    noRecentActivity: string;
    patientNotes: string;
    totalNotes: string;
    totalPlans: string;
    done: string;
    newTreatmentPlan: string;
    treatmentTitlePlaceholder: string;
    diagnosisPlaceholder: string;
    descriptionOptional: string;
    lowPriority: string;
    normal: string;
    estCost: string;
    targetDate: string;
    create: string;
    noAppointmentsLinked: string;
    selectTreatmentOrAppointment: string;
    totalAppointments: string;
    moreAppointments: string;
    financialLedger: string;
    emailSummary: string;
    note: string;
    noNotesYet: string;
    addNoteAbove: string;
    noAppointmentsLinkedShort: string;
    noTreatmentPlansYet: string;
    compareImages: string;
    selectAnImage: string;
    selectImagesToCompare: string;
    compare: string;
    addNotesPlaceholder: string;
    images: string;
    add: string;
    clickToAddImages: string;
    noTreatmentPlanLinked: string;
    noDescription: string;
    linkedAppointments: string;
    appointmentsForThisTreatment: string;
}

type TranslationEntry = Partial<Translations>;

export const translations: Record<Language, TranslationEntry> = {
    en: {
        // Error & status messages
        error: "Error",
        success: "Success",
        microphoneAccessError:
            "Cannot access microphone. Please check your browser permissions and try again.",
        transcriptionFailed:
            "Voice transcription failed. Please try again or type your message.",
        voiceProcessingError: "Error processing voice message. Please try again.",

        // General
        settings: "Settings",
        general: "General",
        theme: "Theme",
        personal: "Personal",
        intelligentDentalAssistant: "Intelligent Dental Assistant",
        experienceFuture: "Experience the Future",
        viewOurDentists: "View Our Dentists",
        aiDiagnosis: "AI Diagnosis",
        startConsultation: "Start Consultation",
        bookAppointment: "Book Appointment",
        emergencyAssistance: "Emergency Assistance",
        language: "Preferred Language",
        patientPortal: "Patient Portal",
        classicBooking: "Classic Booking",
        clinicLogoAlt: "Clinic Logo",
        openMenu: "Open menu",
        collapseExpandSidebar: "Collapse or expand sidebar",
        toggleSidebar: "Toggle sidebar",
        light: "Light",
        dark: "Dark",
        save: "Save",
        confirm: "Confirm",
        cancel: "Cancel",
        close: "Close",
        retry: "Retry",

        // Booking & schedule additions
        selectDentist: "Select Dentist",
        selectAppointmentType: "Select appointment type",
        appointmentType: "Appointment Type",
        confirmBooking: "Confirm Booking",
        booking: "Booking...",
        bookAppointmentDescription: "Book your dental consultation in a few clicks",
        describeSymptoms: "Describe your symptoms or concerns...",
        noSlotsAvailable: "No slots available for this date",
        unableToLoadSlots: "Unable to load available slots",
        unableToBookAppointment: "Unable to book appointment",
        pleaseCompleteAllFields: "Please complete all required fields",
        incompleteProfile: "Incomplete Profile",
        pleaseCompleteProfileFirst: "Please complete your profile in settings before booking an appointment",
        appointmentBooked: "Appointment booked successfully",
        weeklyAvailability: "Weekly Availability",
        workingHours: "Working Hours",
        breakTime: "Break Time",
        saveAvailability: "Save Availability",
        availabilityUpdated: "Availability updated successfully",
        failedToLoadAvailability: "Failed to load availability",
        failedToSaveAvailability: "Failed to save availability",
        saving: "Saving...",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday",

        // Vacation & Schedule Management
        availabilityManagement: "Availability Management",
        weeklySchedule: "Weekly Schedule",
        vacationsAbsences: "Vacations & Absences",
        weeklyPlanning: "Weekly Planning",
        quickPresets: "Quick presets:",
        presetMonFri: "Mon-Fri 9am-5pm",
        presetMonSat: "Mon-Sat 8am-6pm",
        startTime: "Start",
        endTime: "End",
        breakStart: "Break start",
        breakEnd: "Break end",
        addVacation: "Add Vacation",
        startDate: "Start date",
        endDate: "End date",
        vacationType: "Vacation type",
        scheduledVacations: "Scheduled vacations",
        loadingSettings: "Loading settings...",
        vacationsTypeVacation: "Vacation",
        vacationsTypeSick: "Sick Leave",
        vacationsTypePersonal: "Personal Leave",
        addButton: "Add",
        noVacationsScheduled: "No vacations scheduled",
        deleteVacation: "Delete",
        day: "day",
        days: "days",

        // Personal Info
        firstName: "First Name",
        lastName: "Last Name",
        phoneNumber: "Phone Number",
        dateOfBirth: "Date of Birth",
        medicalHistory: "Medical History",
        personalInformation: "Personal Information",
        savePersonalInfo: "Save Personal Information",
        address: "Address",
        emergencyContact: "Emergency Contact",
        enterAddress: "Enter your address",
        enterEmergencyContact: "Enter emergency contact information",

        // Messages
        languageUpdated: "Language Updated",
        languageChangedTo: "Language changed to",
        themeUpdated: "Theme Updated",
        switchedToMode: "Switched to",
        personalInfoSaved: "Personal Information Saved",
        personalInfoUpdated: "Your information has been updated successfully.",
        informationConfirmed: "Information Confirmed",
        changesSaved: "Changes Saved",
        privacyNotice:
            "Your personal and medical data is protected according to our privacy policy.",

        // Auth
        signOut: "Sign Out",
        signIn: "Sign In",
        signUp: "Sign Up",
        createAccount: "Create Account",
        email: "Email",
        password: "Password",
        phone: "Phone",
        optional: "optional",
        welcome: "Welcome",
        accessCaberu: "Access Caberu",
        signInOrCreate: "Sign in or create an account to get started",
        signInButton: "Sign in",
        createAccountButton: "Create account",
        accountCreatedSuccess: "Account created successfully!",
        checkEmailConfirm: "Check your email to confirm your account.",
        signUpError: "Sign up error",
        signInError: "Sign in error",
        signInSuccess: "Sign in successful!",
        welcomeToCaberu: "Welcome to Caberu.",
        myProfile: "My Profile",
        about: "About",

        // Placeholders
        enterFirstName: "Enter your first name",
        enterLastName: "Enter your last name",
        enterPhoneNumber: "Enter your phone number",
        enterMedicalHistory:
            "Enter relevant medical history, allergies, medications, etc.",
        selectLanguage: "Select language",
        enterEmail: "your@email.com",
        enterPassword: "••••••••",

        // Dental Chat
        dentalAssistant: "Dental Assistant",
        typeMessage: "Type your message...",
        send: "Send",
        welcomeMessage: "Hello! I'm Caberu. How can I help you today? 🦷",
        detailedWelcomeMessage: "Welcome to First Smile AI! 🦷✨\n\nI'm your AI dental assistant, available 24/7 to help you with:\n\n🤖 **AI Chat** - Get instant answers to your dental questions\n📅 **Smart Booking** - Book appointments intelligently with duration info\n📸 **Photo Analysis** - Upload photos for AI-powered dental analysis  \n👨‍👩‍👧‍👦 **Family Care** - Book appointments for yourself or family members\n\n💡 **Pro Tip**: Just tell me what's bothering you, and I'll guide you through everything!\n\nHow can I help you today?",
        detailedWelcomeMessageWithName: (
            name: string,
        ) => `Welcome to First Smile AI! 🦷✨\n\nHello ${name}! I'm your AI dental assistant, available 24/7 to help you with:\n\n🤖 **AI Chat** - Get instant answers to your dental questions\n📅 **Smart Booking** - Book appointments intelligently with duration info\n📸 **Photo Analysis** - Upload photos for AI-powered dental analysis  \n👨‍👩‍👧‍👦 **Family Care** - Book appointments for yourself or family members\n\n💡 **Pro Tip**: Just tell me what's bothering you, and I'll guide you through everything!\n\nHow can I help you today?`,

        // Landing page
        aiDiagnosisDesc: "Get instant AI-powered assessments",
        smartBooking: "Smart Booking",
        smartBookingDesc: "Book appointments intelligently",
        support24_7: "24/7 Support",
        support24_7Desc: "Round-the-clock assistance",
        initializingExperience: "Initializing your experience",
        preparingAssistant:
            "Preparing your personalized dental assistant powered by advanced AI technology",

        // Navigation
        chat: "Chat",
        appointments: "Appointments",

        // Appointment booking
        bookConsultationDescription:
            "Book your dental consultation in just a few clicks",
        chooseDentist: "Choose Dentist",
        selectDate: "Select Date",
        selectTime: "Select Time",
        availableSlots: "Available Slots",
        consultationReason: "Consultation Reason",
        generalConsultation: "General consultation",
        routineCheckup: "Routine checkup",
        dentalPain: "Dental pain",
        emergency: "Emergency",
        cleaning: "Cleaning",
        other: "Other",
        bookNow: "Book Now",
        appointmentConfirmed: "Appointment confirmed!",
        errorTitle: "Error",
        cannotLoadSlots: "Unable to load available slots",
        cannotLoadDentists: "Unable to load dentist list",
        missingInformation: "Missing information",
        selectDentistDateTime: "Please select a dentist, date and time",
        slotNoLongerAvailable: "This slot is no longer available",
        cannotCreateAppointment: "Unable to create appointment",

        // Appointments list
        myAppointments: "My Appointments",
        appointmentHistory: "Appointment History",
        upcomingAppointments: "Upcoming Appointments",
        pastAppointments: "Past Appointments",
        newAppointment: "New",
        appointmentDetails: "Appointment Details",
        loading: "Loading...",
        noUpcomingAppointments: "No upcoming appointments",
        noPastAppointments: "No past appointments",
        noAppointmentsFound: "No appointments found",
        viewMore: "View More",
        showLess: "Show Less",
        more: "more",
        reschedule: "Reschedule",
        cancelAppointment: "Cancel",
        confirmCancellation: "Cancel Appointment",
        confirmCancellationMessage:
            "Are you sure you want to cancel this appointment? This action cannot be undone.",
        keepAppointment: "Keep Appointment",
        yesCancelAppointment: "Yes, Cancel",
        appointmentCancelled: "Appointment cancelled successfully",
        failedToCancelAppointment: "Failed to cancel appointment",

        // Appointments Management
        appointmentsManagement: "Appointments Management",
        manageViewAppointments: "Manage and view all your patient appointments",
        refresh: "Refresh",
        searchByPatient: "Search by patient name, reason, or notes...",
        todayPlus7Days: "Today + 7 days",
        nextWeek: "Next Week",
        nextMonth: "Next Month",
        allTime: "All Time",
        thisWeek: "This Week",
        thisMonth: "This Month",
        allStatus: "All Status",
        pending: "Pending",
        time: "Time",
        patient: "Patient",
        status: "Status",
        actions: "Actions",
        view: "View",
        notRegisteredDentist: "You are not registered as a dentist. Please contact support.",
        contactSupport: "Contact Support",
        todaysAppointments: "Today's Appointments",
        urgentCases: "Urgent Cases",
        completionRate: "Completion Rate",
        highPriority: "High priority appointments",
        estimatedRevenue: "Revenue (Estimated)",
        avg: "Avg",
        statusOverview: "Status Overview",
        generalConsultationLower: "General consultation",

        // Chat commands & integration
        showMyAppointments: "Here are your appointments:",
        nextAppointment: "Your next appointment is:",
        suggestedTime: (dentist: string, time: string) =>
            `Based on your preferences, I suggest ${time} with ${dentist}`,
        wouldYouLikeToBook: "Would you like to book this appointment?",
        seeOtherOptions: "See other options",
        appointmentSuggestion: (dentist: string, date: string, time: string) =>
            `📅 Available: ${date} at ${time} with ${dentist}`,
        bookThisSlot: "Book this slot",
        showOtherTimes: "Show other times",
        settingsUpdated: "Settings Updated",
        preferencesChanged: "Your preferences have been updated",

        // Error handling
        microphoneError: "Microphone Error",
        cameraError: "Camera Error",
        mediaAccessDenied:
            "Media access was denied. Please check your browser settings.",
        mediaNotSupported: "Media features are not supported on this device.",
        tryAgain: "Try Again",

        // Privacy & validation
        privacyPolicyLink: "Privacy Policy",
        dataHandlingInfo: "Learn how we handle your personal and medical data.",
        invalidPhoneFormat: "Please enter a valid phone number",
        invalidEmailFormat: "Please enter a valid email address",
        requiredField: "This field is required",
        consentHealthData: "I consent to Caberu processing my personal and health data for appointment scheduling and dental service support purposes.",
        childConsentNote: "If you are entering data for a patient under 16, you confirm you are their parent or legal guardian and consent to processing their data.",
        downloadMyData: "Download My Data",
        deleteAccount: "Delete My Account & Data",
        deleteAccountConfirm: "Deleting your account will permanently remove all your personal and health data from Caberu's systems. This cannot be undone. Are you sure?",
        aiAdviceDisclaimer: "⚠️ AI suggestions are for informational purposes only and are not a substitute for professional dental advice.",

        // Onboarding
        welcomeToFirstSmile: "Welcome to First Smile AI! 🦷",
        yourAIDentalAssistant: "Your AI Dental Assistant",
        onboardingIntro:
            "I'm here to help you with all your dental needs, 24/7. This preview shows how First Smile AI will work in the real world.",
        smartFeaturesService: "Smart Features at Your Service",
        aiChat: "AI Chat",
        aiChatDesc: "Get instant answers to dental questions",
        photoAnalysis: "Photo Analysis",
        photoAnalysisDesc: "Upload photos for AI analysis",
        familyCare: "Family Care",
        familyCareDesc: "Book for family members too",
        bookForFamilyTitle: "Book for Anyone in Your Family",
        familyFriendlyBooking: "Family-Friendly Booking",
        bookForYourself: "Book appointments for yourself",
        bookForChildren: "Book for your children",
        bookForFamily: "Book for family members",
        alwaysTellDuration:
            "I'll always tell you appointment duration and end time",
        readyToStart: "Ready to Get Started?",
        youreAllSet: "You're All Set! 🎉",
        onboardingEnd:
            "Start chatting with me below to book appointments, ask questions, or get dental advice.",
        proTip: "💡 Pro Tip:",
        proTipText:
            "Just tell me what's bothering you, and I'll guide you through everything!",
        letsStart: "Let's Start!",
        next: "Next",
        back: "Back",
        previewNotice:
            "This is a working preview of First Smile AI ready for real-world use.",
        aiDisclaimer: "This assistant uses AI. Double check any medical advice.",
        acceptTerms: "I accept the Terms and Conditions",
        viewTerms: "View Terms",
        termsTitle: "Terms and Conditions",
        termsIntro:
            "Please read these terms carefully before using First Smile AI.",
        termsUse: "Use this service responsibly and respect others.",
        termsPrivacy: "We handle your data according to our privacy policy.",
        termsMedical: "Always consult a professional for serious medical concerns.",

        // Language selection
        selectPreferredLanguage: "Select Your Preferred Language",
        languageSelectionDescription:
            "Choose your language to get started with First Smile AI",

        // Emergency Triage
        'triage.title': 'Emergency Dental Triage',
        'triage.subtitle': 'Please answer the following questions to assess your urgency level',
        'triage.pain.title': 'Pain Level Assessment',
        'triage.pain.question': 'On a scale of 1-10, how severe is your pain?',
        'triage.pain.none': 'No pain (1)',
        'triage.pain.severe': 'Severe pain (10)',
        'triage.symptoms.title': 'Additional Symptoms',
        'triage.symptoms.bleeding': 'Bleeding from gums or teeth',
        'triage.symptoms.swelling': 'Facial or gum swelling',
        'triage.symptoms.fever': 'Fever (>38°C)',
        'triage.symptoms.difficulty': 'Difficulty swallowing or breathing',
        'triage.symptoms.trauma': 'Recent dental trauma or injury',
        'triage.duration.title': 'Duration of Symptoms',
        'triage.duration.question': 'How long have you had these symptoms?',
        'triage.duration.hours': 'Less than 6 hours',
        'triage.duration.day': '6-24 hours',
        'triage.duration.days': '2-7 days',
        'triage.duration.week': 'More than a week',
        'triage.medical.title': 'Medical History',
        'triage.medical.diabetes': 'Diabetes',
        'triage.medical.heart': 'Heart condition',
        'triage.medical.blood': 'Blood disorders',
        'triage.medical.immune': 'Compromised immune system',
        'triage.submit': 'Assess Urgency & Book Appointment',
        'triage.result.emergency': 'EMERGENCY - Immediate attention required',
        'triage.result.high': 'HIGH URGENCY - Same day appointment needed',
        'triage.result.medium': 'MEDIUM URGENCY - Appointment within 2-3 days',
        'triage.result.low': 'LOW URGENCY - Regular appointment needed',

        // Booking Triage
        'booking.title': 'Book Your Appointment',
        'booking.earliest': 'Earliest Available Slots',
        'booking.confirm': 'Confirm Appointment',
        'booking.success': 'Appointment booked successfully!',
        'booking.detailsTitle': 'Appointment Details',
        'booking.dentist': 'Dentist',
        'booking.date': 'Date',
        'booking.time': 'Time',
        'booking.urgency': 'Urgency',
        'booking.urgentArrivalNotice': 'Due to the urgent nature of your case, please arrive 15 minutes early. If your condition worsens, please contact emergency services immediately.',
        'booking.continue': 'Continue to Dashboard',
        'booking.selectDate': 'Select Date',
        'booking.availableTimes': 'Available Times',
        'booking.noSlots': 'No available slots for this date',
        'booking.selectDatePrompt': 'Please select a date to view available times',
        'booking.selectedDentist': 'Selected dentist',
        'booking.selectedBadge': 'Selected',

        // Emergency Triage Entry
        'entry.heroTitle': 'Emergency Triage Assessment',
        'entry.heroDesc': 'Fast, secure, and accurate dental emergency assessment',
        'entry.ctaStart': 'Start Emergency Assessment',
        'entry.steps.assessSymptoms.title': 'Assess Symptoms',
        'entry.steps.assessSymptoms.desc': 'Answer questions about your pain and symptoms',
        'entry.steps.getUrgency.title': 'Get Urgency Level',
        'entry.steps.getUrgency.desc': 'Receive your urgency rating (1-5 scale)',
        'entry.steps.viewSlots.title': 'View Available Slots',
        'entry.steps.viewSlots.desc': 'See prioritized appointment times',
        'entry.steps.bookInstantly.title': 'Book Instantly',
        'entry.steps.bookInstantly.desc': 'Confirm your appointment immediately',
        'entry.emergencyNotice.title': 'Life-Threatening Emergency?',
        'entry.emergencyNotice.desc': "If you're experiencing severe breathing difficulties, uncontrolled bleeding, or signs of serious infection, call emergency services (112) immediately.",
        'entry.gdpr.title': 'Privacy & Security',
        'entry.gdpr.desc': 'Your health information is protected under GDPR. Data is encrypted and only shared with your selected dentist for appointment purposes.',
        'entry.return': 'Return to Main App',
        'entry.stats.minutes': '2-3 Minutes',
        'entry.stats.quick': 'Quick Assessment',
        'entry.stats.gdpr': 'GDPR Compliant',
        'entry.stats.secure': 'Secure & Private',
        'entry.stats.directBooking': 'Direct Booking',
        'entry.stats.noChat': 'No Chat Required',

        // Appointment Details Dialog
        appointmentDetailsTitle: "Appointment Details",
        appointmentInformation: "Appointment Information",
        urgency: "urgency",
        reason: "Reason:",
        completed: "Completed:",
        notes: "Notes",
        consultationNotes: "Consultation Notes",
        additionalNotes: "Additional Notes",
        medicalRecords: "Medical Records",
        prescriptions: "Prescriptions",
        billingInformation: "Billing Information",
        findings: "Findings:",
        recommendations: "Recommendations:",
        prescribed: "Prescribed:",
        invoice: "Invoice",
        download: "Download",
        patientAmount: "Patient Amount:",
        vat: "VAT:",
        total: "Total:",
        created: "Created:",
        failedToLoadDetails: "Failed to load appointment details",

        // Patient Dashboard Components
        goodMorning: "Good morning",
        goodAfternoon: "Good afternoon",
        goodEvening: "Good evening",
        hereIsYourHealthOverview: "Here's your health overview",
        confirmed: "Confirmed",
        join: "Join",
        activeMedications: "Active medications",
        viewInCareTab: "View in Care tab",
        balance: "Balance",
        due: "Due",
        amountDue: "Amount due",
        allPaid: "All paid",
        payNow: "Pay Now",
        aiAssistant: "AI Assistant",
        getInstantHelpWith: "Get instant help with:",
        bookingAppointments: "Booking appointments",
        dentalQuestions: "Dental questions",
        emergencyTriage: "Emergency triage",
        startChat: "Start Chat",
        dailyTipsReminders: "Daily Tips & Reminders",
        morningReminder: "Morning Reminder",
        dontForgetToBrush: "Don't forget to brush for 2 minutes",
        healthTip: "Health Tip",
        flossingDaily: "Flossing daily reduces gum disease by 40%",
        upcoming: "Upcoming",
        past: "Past",
        book: "Book",
        dentalCleaningRecommended: "Dental cleaning recommended in 2 months",
        healthRecords: "Health Records",
        rewards: "Rewards",
        quicklyBookViewRecords: "Quickly book, view records, and manage payments.",
        yourTreatmentsWillAppear: "Your treatments and visits will appear here.",
        unpaid: "Unpaid",
        paid: "Paid",
        statements: "Statements",
        paidInvoices: "Your paid invoices will appear here.",
        downloadStatements: "Download monthly statements.",
        viewManageMedications: "View and manage your medications.",
        upload: "Upload",
        shareLink: "Share link",
        insuranceProvider: "Provider",
        insuranceProviderPlaceholder: "Mutuality / Insurance name",
        policyNumber: "Policy / Member ID",
        policyNumberPlaceholder: "Policy number",
        healthStats: "Health Stats",
        healthRating: "Health Rating",
        excellent: "Excellent",
        visitsThisYear: "Visits This Year",
        onTrack: "On track",
        coverageUsed: "Coverage Used",
        remaining: "remaining",
        healthImproved: "Health Improved",
        lastSixMonths: "Last 6 months",
        treatmentPlans: "Treatment Plans",
        manageDentalVisits: "Manage your dental visits",
        bookNew: "Book New",
        active: "Active",
        mainClinic: "Main Clinic",
        generalCheckup: "General Checkup",
        today: "Today",
        calendar: "Calendar",
        list: "List",
        history: "History",
        cancelled: "Cancelled",
        scheduled: "Scheduled",

        // Dentist Dashboard
        loadingDentistDashboard: "Loading dentist dashboard...",
        notRegisteredAsDentist: "You are not registered as a dentist. Please contact support.",
        dentiDashboard: "Denti Dashboard",
        dentistPortal: "Dentist Portal",
        loadingDentistProfile: "Loading dentist profile...",
        // AppShell & Navigation
        navClinical: "Clinical",
        navBusiness: "Business",
        navOperations: "Operations",
        navAdmin: "Admin",
        navDashboard: "Dashboard",
        navAppointments: "Appointments",
        navPatients: "Patients",
        navPayments: "Payments",
        navAnalytics: "Analytics",
        // Added missing labels
        navReports: "Reports",
        navInventory: "Inventory",
        navImport: "Import",
        navSchedule: "Schedule",
        navSettings: "Settings",
        navBrandingLoc: "Branding & Localization",
        navSecurity: "Privacy & Security",
        topSearch: "Search",
        topClinic: "Clinic",
        topProfile: "Profile",
        // Patient portal navigation (pnav.*)
        pnav: {
            group: {
                care: "Care",
                billing: "Billing",
                documents: "Documents",
                account: "Account",
            },
            care: {
                home: "Home",
                appointments: "Appointments",
                prescriptions: "Prescriptions",
                history: "Treatment History",
            },
            billing: { main: "Invoices & Payments" },
            docs: { main: "My Documents" },
            account: {
                profile: "Profile & Settings",
                insurance: "Insurance / Mutuality",
                privacy: "Privacy & Security",
                help: "Help & Support",
            },
        },
        // Treatment records
        searchTreatments: "Search treatments...",
        filterByType: "Filter by type",
        allTypes: "All types",
        consultation: "Consultation",
        treatment: "Treatment",
        xray: "X-Ray",
        labResult: "Lab Result",
        dentist: "Dentist",
        treatmentType: "Treatment Type",
        date: "Date",
        noRecordsFound: "No treatment records found",
        appointmentRescheduled: "Appointment rescheduled",
        savedSuccessfully: "Saved successfully",

        // Dashboard & Portal
        todaysSchedule: "Today's Schedule",
        completedThisWeek: "Completed This Week",
        noAppointmentsToday: "No appointments today",
        noAppointmentsTodayDesc: "You don't have any appointments scheduled for today. Take this time to catch up on other tasks or schedule new appointments.",
        viewAllAppointments: "View All Appointments",
        scheduleNew: "Schedule New",
        unknownPatient: "Unknown Patient",
        urgent: "Urgent",
        noReasonSpecified: "No reason specified",

        // Messages Page
        signInToMessage: "Sign in to Message",
        needSignedInToMessage: "You need to be signed in to send and receive messages",
        selectConversation: "Select a conversation",

        // Patient Management
        selectPatient: "Select Patient",
        findPatient: "Find patient...",
        addNewPatient: "Add New Patient",
        overview: "Overview",
        clinical: "Clinical",
        schedule: "Schedule",
        financial: "Financial",
        years: "years",
        yearsOld: "years old",
        medicalAlert: "Medical Alert",
        unpaidBalance: "Unpaid Balance",
        quickActions: "Quick Actions",
        createPayment: "Create Payment",
        addTreatmentPlan: "Add Treatment Plan",
        addQuickNote: "Add Quick Note",
        exportPdf: "Export PDF",
        searchNotesAppointmentsTreatments: "Search notes, appointments, treatments...",
        patientTimeline: "Patient Timeline",
        noPatientsYet: "No patients yet",
        appointmentCompleted: "Appointment completed",
        appointmentCancelledToast: "Appointment cancelled",
        patientNotifiedByEmail: "Patient has been notified by email",
        appointmentConfirmedToast: "Appointment confirmed",
        noteAdded: "Note added",
        treatmentPlanCreated: "Treatment plan created",
        treatmentPlanDeleted: "Treatment plan deleted",
        clickUndoToRestore: "Click undo to restore",
        appointmentDeleted: "Appointment deleted",
        noteDeleted: "Note deleted",
        treatmentPlanRestored: "Treatment plan restored",
        appointmentRestored: "Appointment restored",
        noteRestored: "Note restored",
        appointmentLinked: "Appointment linked",
        linkedTo: "Linked to",
        noEmail: "No email",
        patientHasNoEmail: "Patient has no email address",
        patientUpdated: "Patient updated",
        enterTitle: "Please enter a title",
        failedToCreateTreatmentPlan: "Failed to create treatment plan",
        failedToUpdatePatient: "Failed to update patient",
        failedToDeleteTreatmentPlan: "Failed to delete treatment plan",
        failedToDeleteAppointment: "Failed to delete appointment",
        failedToDeleteNote: "Failed to delete note",
        failedToRestoreTreatmentPlan: "Failed to restore treatment plan",
        failedToRestoreAppointment: "Failed to restore appointment",
        failedToRestoreNote: "Failed to restore note",
        failedToLinkAppointment: "Failed to link appointment",
        failedToAddNote: "Failed to add note",
        deleteTreatmentPlan: "Delete Treatment Plan",
        deleteAppointment: "Delete Appointment",
        confirmDeleteTreatmentPlan: "Are you sure you want to delete this treatment plan?",
        confirmDeleteAppointment: "Are you sure you want to permanently delete this appointment?",
        confirmDeleteSelected: "Are you sure you want to delete the selected items?",
        itemsDeleted: "items deleted",
        undo: "Undo",

        // Dentist: Clinical appointment UI
        completeAppointment: "Complete Appointment",
        prescriptionsShort: "Prescriptions",
        paymentsShort: "Payments",
        viewAll: "View all",
        collapse: "Collapse",
        expand: "Expand",
        srAlertNew: "New critical alert",
        srQuickActions: "Quick actions toolbar",

        // Settings pages
        profile: "Profile",
        services: "Services",
        hours: "Hours",
        appts: "Appts",
        team: "Team",
        brand: "Brand",
        billing: "Billing",
        security: "Security",
        scheduleAvailability: "Schedule & Availability",
        appointmentPreferences: "Appointment preferences",
        requireApprovalBefore: "Require approval before confirming",
        approveNewPatientRequests: "Approve new patient requests to prevent double booking or missing prep time.",
        manualReviewRequired: "Manual review required",
        requestsAutoConfirmed: "Requests auto-confirmed",
        saveChanges: "Save changes",
        savingChanges: "Saving...",
        saveImmediately: "Save changes so patients see the right booking rules immediately.",
        staffManagement: "Staff Management",
        manageTeamMembers: "Manage your team members and their access",
        dangerZone: "Danger Zone",
        irreversibleActions: "Irreversible actions that affect your clinic membership",
        leaveClinic: "Leave Clinic",
        loseAccessWarning: "You will lose access to all clinic data and appointments.",
        lastMemberWarning: "If you are the last member, the entire business will be permanently deleted.",
        leaveClinicConfirm: "This action is irreversible. You will lose access to all clinic data, appointments, and patient records.",
        enterPasswordConfirm: "Enter your password to confirm",
        yourPassword: "Your password",
        leaving: "Leaving...",
        businessDeleted: "Business deleted",
        lastMemberDeletedDesc: "You were the last member. The business has been permanently deleted.",
        leftClinic: "Left clinic",
        stillBelongOther: "You left the clinic. You still belong to other clinics.",
        leftRoleRemoved: "You left the clinic and your provider role was removed.",
        passwordRequired: "Password required",
        enterPasswordLeave: "Please enter your password to confirm leaving the clinic.",
        couldntLoadSettings: "Couldn't load appointment settings",
        refreshOrTryAgain: "Please refresh the page or try again in a moment.",
        couldntSaveSettings: "Couldn't save appointment settings",
        appointmentRulesUpdated: "Appointment rules updated",
        rulesUpdatedDesc: "Patients will see the new approval rules immediately.",
        loadingPortal: "Loading portal...",
        accessDenied: "Access Denied",
        startTour: "Start Tour",
        reportsComingSoon: "Reports (Coming Soon)",
        sectionNotFound: "Section not found",
        clinicalNotAvailable: "Clinical features not available for this business type",
        paymentNotAvailable: "Payment features not available",

        // Branding page
        brandingSettings: "Branding & Settings",
        brandingSubtitle: "Customize your business appearance, services, and AI behavior",
        branding: "Branding",
        aiAssistantConfig: "AI Assistant",
        templates: "Templates",
        emailTemplates: "Email",
        payments: "Payments",
        clinicInformation: "Clinic Information",
        businessLinkQr: "Business Link & QR Code",
        uploadLogo: "Upload Logo",
        logoUploadDesc: "Upload your clinic logo (max 2MB)",
        chooseLogo: "Choose Logo",
        logoUploaded: "Logo Uploaded",
        logoUploadedDesc: "Your clinic logo has been uploaded successfully",
        invalidFile: "Invalid File",
        uploadImageFile: "Please upload an image file",
        fileTooLarge: "File Too Large",
        logoSizeLimit: "Logo must be less than 2MB",
        uploadFailed: "Upload Failed",
        clinicName: "Clinic Name",
        tagline: "Tagline",
        businessSlug: "Business Slug",
        slugCannotContain: "Slug cannot contain",
        forwardSlashes: "forward slashes",
        spaces: "spaces",
        onlyOneDot: "Slug can only contain one dot",
        copyLink: "Copy Link",
        linkCopied: "Link copied!",
        linkCopiedDesc: "Business link copied to clipboard",
        failedToCopy: "Failed to copy",
        couldNotCopyLink: "Could not copy link to clipboard",
        showQrCode: "Show QR",
        downloadQr: "Download QR",
        qrDownloaded: "QR Code Downloaded",
        qrDownloadedDesc: "The QR code for your business link has been downloaded",
        downloadFailed: "Download Failed",
        qrDownloadFailed: "We couldn't download the QR code. Please try again.",
        settingsSaved: "Settings Saved",
        settingsSavedDesc: "Your branding settings have been saved successfully. All changes are now active!",
        templateSwitched: "Template Switched Successfully",
        templateSwitchedDesc: "Your business is now using the",
        template: "template",
        saveFailed: "Save Failed",
        businessTemplate: "Business Template",
        changeTemplate: "Change Template",
        templateWarning: "Changing your template will reset your AI behavior settings to defaults for the new template.",
        confirmTemplateChange: "Confirm Change",
        testAi: "Test AI",

        // Security page
        securityAccess: "Security & Access",
        securitySubtitle: "Manage security settings and team access",
        changePassword: "Change Password",
        changePasswordDesc: "Update your password regularly to keep your account secure",
        currentPassword: "Current Password",
        newPassword: "New Password",
        confirmNewPassword: "Confirm New Password",
        enterCurrentPassword: "Enter current password",
        enterNewPasswordMin: "Enter new password (min 8 characters)",
        confirmPasswordPlaceholder: "Confirm new password",
        updatePassword: "Update Password",
        updating: "Updating...",
        passwordsDontMatch: "Passwords Don't Match",
        passwordsDontMatchDesc: "Please make sure your new passwords match",
        passwordTooShort: "Password Too Short",
        passwordMinLength: "Password must be at least 8 characters long",
        passwordUpdated: "Password Updated",
        passwordUpdatedDesc: "Your password has been changed successfully. A confirmation email has been sent to your inbox.",
        twoFactorAuth: "Two-Factor Authentication",
        twoFactorAuthDesc: "Add an extra layer of security to your account",
        enable2fa: "Enable 2FA",
        require2faCode: "Require a verification code in addition to your password",
        twoFaDisabled: "2FA Disabled",
        twoFaDisabledDesc: "Two-factor authentication has been disabled",
        twoFaEnabled: "Two-factor authentication is enabled. You will receive a verification code via email when logging in.",
        staffRoles: "Staff & Roles",
        staffRolesDesc: "Manage team members and their access levels",
        noStaffYet: "No staff members added yet",
        dataPrivacy: "Data & Privacy",
        dataPrivacyDesc: "Manage your data and privacy settings",
        exportYourData: "Export Your Data",
        exportDataDesc: "Download all your personal data in a portable format",
        exportData: "Export Data",
        exporting: "Exporting...",
        exportStarted: "Export Started",
        exportStartedDesc: "Your data export has been started. You will receive an email when it is ready.",
        exportFailed: "Export Failed",
        deleteYourAccount: "Delete Your Account",
        deleteAccountDesc: "Permanently delete your account and all associated data",
        deleteAccountWarningDesc: "This action cannot be undone. All your data will be permanently deleted.",
        confirmDeleteAccount: "I understand this is permanent",
        deleting: "Deleting...",
        accountDeleted: "Account Deleted",
        accountDeletedDesc: "Your account has been permanently deleted.",
        deleteFailed: "Delete Failed",

        // Users page
        teamMembers: "Team Members",
        teamMembersDesc: "Manage staff and patients for your clinic",
        totalUsers: "Total Users",
        activeUsers: "Active Users",
        pendingInvites: "Pending Invites",
        admins: "Admins",
        userList: "User List",
        userListDesc: "Search and manage all users in the system",
        searchByNameEmailRole: "Search by name, email, or role...",
        name: "Name",
        roles: "Roles",
        joined: "Joined",
        noUsersFound: "No users found",
        noRolesAssigned: "No roles assigned",
        invitationPending: "Invitation Pending",
        inactive: "Inactive",

        // Profile page
        profileInformation: "Profile Information",
        profileInfoDesc: "Update your personal and professional details",
        specialization: "Specialization",
        specializationPlaceholder: "General Dentistry, Orthodontics, etc.",
        clinicAddress: "Clinic Address",
        clinicAddressPlaceholder: "123 Main Street, City, State, ZIP",
        professionalBio: "Professional Bio",
        bioPlaceholder: "Tell patients about yourself, your experience, and specializations...",
        profileUpdated: "Profile updated successfully",

        // Payment page
        paymentCancelled: "Payment Cancelled",
        paymentCancelledMessage: "Your payment was cancelled. You can try again or contact your dentist if you need assistance.",
        closeWindow: "Close Window",

        // Billing empty states
        billingNotAvailable: "Billing Not Available",
        billingNotAvailableDesc: "Payment requests are not enabled for this practice. Please contact your provider for payment information.",
        goToCareHome: "Go to Care Home",
        noPaidInvoices: "No Paid Invoices",
        noPaidInvoicesDesc: "Your payment history will appear here once you've made payments.",
        viewUnpaid: "View Unpaid",
        noStatementsAvailable: "No Statements Available",
        noStatementsDesc: "Your billing statements will be available for download once generated.",
        managePaymentsDesc: "Manage your payments, invoices, and billing statements",
        amountDueLabel: "due",

        // Appointment actions
        noAppointmentsYet: "You don't have any appointments yet.",
        bookFirstAppointment: "Book Your First Appointment",
        confirmReschedule: "Confirm Reschedule",
        rescheduleAppointment: "Reschedule Appointment",
        newDate: "New Date",
        newTime: "New Time",
        bookNewAppointment: "Book New Appointment",
        selectAPatient: "Select a patient",
        reasonForVisit: "Reason for Visit",
        durationMinutes: "Duration (minutes)",
        fillRequiredFields: "Please fill in all required fields",
        appointmentBookedDesc: "The appointment has been booked successfully.",
        cancelAppointmentTitle: "Cancel Appointment",
        cancelAppointmentConfirm: "Are you sure you want to cancel this appointment? This action cannot be undone.",
        goBack: "Go Back",
        all: "All",

        // Availability settings
        availabilitySettings: "Availability Settings",
        manageWorkingHours: "Manage your working hours and schedule",
        loadingAvailability: "Loading availability settings...",
        failedToFetchAvailability: "Failed to fetch availability settings",
        quickSchedulePresets: "Quick Schedule Presets",
        standardWeek: "Standard Week",
        standardWeekDesc: "Monday to Friday, 9 AM - 5 PM",
        extendedHours: "Extended Hours",
        extendedHoursDesc: "Monday to Saturday, 8 AM - 6 PM",
        partTime: "Part-Time",
        partTimeDesc: "Tuesday, Thursday, Saturday only",
        presetApplied: "Preset Applied",
        scheduleApplied: "schedule has been applied",
        saveSettings: "Save Settings",
        workingDays: "Working Days",
        totalHoursWeek: "Total Hours/Week",
        currentStatus: "Current Status",
        available: "Available",
        unavailable: "Unavailable",
        makeAllDaysAvailable: "Make All Days Available",
        makeAllDaysUnavailable: "Make All Days Unavailable",
        weekdaysOnly: "Weekdays Only (Mon-Fri)",
        weekendsOnly: "Weekends Only (Sat-Sun)",
        availabilitySaved: "Availability settings saved successfully",
        failedToSave: "Failed to save availability settings",

        // Schedule block labels
        breakLabel: "Break",
        sickLeaveLabel: "Sick Leave",
        vacationLabel: "Vacation",
        unavailableLabel: "Unavailable",
        dayOff: "Day Off",
        beforeHours: "Before Hours",
        afterHours: "After Hours",
        lunchBreak: "Lunch Break",
        timeOff: "Time Off",

        // Top bar / Navigation
        logOut: "Log Out",
        failedToSignOut: "Failed to sign out. Please try again.",
        dentalPortal: "Dental Portal",
        provider: "Provider",

        // Next Appointment Widget
        viewDetails: "View Details",
        complete: "Complete",

        // Patient Management Page (new keys)
        searchNotesAppointments: "Search notes, appointments, treatments...",
        timeline: "Timeline",
        select: "Select",
        delete: "Delete",
        patientScore: "Patient Score",
        appointmentAttendance: "Appointment Attendance",
        noBalance: "No Balance",
        outstandingBalance: "Outstanding Balance",
        needsFollowup: "Needs Followup",
        treatmentProgress: "Treatment Progress",
        noActiveTreatmentPlans: "No active treatment plans",
        createPlan: "Create Plan",
        totalVisits: "Total Visits",
        lastVisit: "Last Visit",
        never: "Never",
        daysAgo: "days ago",
        balanceDue: "Balance Due",
        addNote: "Add Note",
        treatmentPlan: "Treatment Plan",
        scheduleNow: "Schedule Now",
        recentActivity: "Recent Activity",
        noRecentActivity: "No recent activity",
        patientNotes: "Patient Notes",
        totalNotes: "total notes",
        totalPlans: "total plans",
        done: "Done",
        newTreatmentPlan: "New Treatment Plan",
        treatmentTitlePlaceholder: "Treatment title...",
        diagnosisPlaceholder: "Diagnosis...",
        descriptionOptional: "Description (optional)",
        lowPriority: "Low Priority",
        normal: "Normal",
        estCost: "Est. Cost €",
        targetDate: "Target Date",
        create: "Create",
        noAppointmentsLinked: "No appointments linked to this treatment yet",
        selectTreatmentOrAppointment: "Select a treatment or appointment from the sidebar",
        totalAppointments: "total appointments",
        moreAppointments: "more appointments",
        financialLedger: "Financial Ledger",
        emailSummary: "Email Summary",
        note: "Note",
        noNotesYet: "No notes yet",
        addNoteAbove: "Add a note above to get started",
        noAppointmentsLinkedShort: "No appointments linked",
        noTreatmentPlansYet: "No treatment plans yet",
        compareImages: "Compare Images",
        selectAnImage: "Select an image",
        selectImagesToCompare: "Select images to compare:",
        compare: "Compare",
        addNotesPlaceholder: "Add notes...",
        images: "Images",
        add: "Add",
        clickToAddImages: "Click to add images",
        noTreatmentPlanLinked: "No treatment plan linked",
        noDescription: "No description",
        linkedAppointments: "Linked Appointments",
        appointmentsForThisTreatment: "Appointments for this Treatment",

        // Common
        'common.cancel': "Cancel",
        'common.next': "Next",
        'common.back': "Back",
        'common.loading': "Loading...",
        'common.success': "Success",
    },
    fr: {
        // Error & status messages
        error: "Erreur",
        success: "Succès",
        microphoneAccessError:
            "Impossible d'accéder au microphone. Veuillez vérifier les autorisations de votre navigateur et réessayer.",
        transcriptionFailed:
            "Échec de la transcription vocale. Veuillez réessayer ou taper votre message.",
        voiceProcessingError:
            "Erreur lors du traitement du message vocal. Veuillez réessayer.",

        // General
        settings: "Paramètres",
        general: "Général",
        theme: "Thème",
        personal: "Personnel",
        intelligentDentalAssistant: "Assistant Dentaire Intelligent",
        experienceFuture: "Découvrez le futur",
        viewOurDentists: "Voir nos dentistes",
        aiDiagnosis: "Diagnostic IA",
        startConsultation: "Commencer la consultation",
        bookAppointment: "Prendre Rendez-vous",
        emergencyAssistance: "Assistance d'urgence",
        language: "Langue préférée",
        patientPortal: "Portail patient",
        classicBooking: "Réservation classique",
        clinicLogoAlt: "Logo de la clinique",
        openMenu: "Ouvrir le menu",
        collapseExpandSidebar: "Réduire ou développer la barre latérale",
        toggleSidebar: "Basculer la barre latérale",
        light: "Clair",
        dark: "Sombre",
        save: "Enregistrer",
        confirm: "Confirmer",
        cancel: "Annuler",
        close: "Fermer",
        retry: "Réessayer",

        // Booking & schedule additions
        selectDentist: "Sélectionner un Dentiste",
        selectAppointmentType: "Sélectionner le type de rendez-vous",
        appointmentType: "Type de Rendez-vous",
        confirmBooking: "Confirmer la Réservation",
        booking: "Réservation en cours...",
        bookAppointmentDescription: "Réservez votre consultation dentaire en quelques clics",
        describeSymptoms: "Décrivez vos symptômes ou préoccupations...",
        noSlotsAvailable: "Aucun créneau disponible pour cette date",
        unableToLoadSlots: "Impossible de charger les créneaux disponibles",
        unableToBookAppointment: "Impossible de réserver le rendez-vous",
        pleaseCompleteAllFields: "Veuillez remplir tous les champs obligatoires",
        incompleteProfile: "Profil Incomplet",
        pleaseCompleteProfileFirst: "Veuillez compléter votre profil dans les paramètres avant de prendre rendez-vous",
        appointmentBooked: "Rendez-vous réservé avec succès",
        weeklyAvailability: "Disponibilité Hebdomadaire",
        workingHours: "Heures de Travail",
        breakTime: "Pause",
        saveAvailability: "Enregistrer la Disponibilité",
        availabilityUpdated: "Disponibilité mise à jour avec succès",
        failedToLoadAvailability: "Échec du chargement de la disponibilité",
        failedToSaveAvailability: "Échec de l'enregistrement de la disponibilité",
        saving: "Sauvegarde...",
        monday: "Lundi",
        tuesday: "Mardi",
        wednesday: "Mercredi",
        thursday: "Jeudi",
        friday: "Vendredi",
        saturday: "Samedi",
        sunday: "Dimanche",

        // Vacation & Schedule Management
        availabilityManagement: "Gestion des Disponibilités",
        weeklySchedule: "Horaires hebdomadaires",
        vacationsAbsences: "Congés & Absences",
        weeklyPlanning: "Planification hebdomadaire",
        quickPresets: "Presets rapides:",
        presetMonFri: "Lun-Ven 9h-17h",
        presetMonSat: "Lun-Sam 8h-18h",
        startTime: "Début",
        endTime: "Fin",
        breakStart: "Pause début",
        breakEnd: "Pause fin",
        addVacation: "Ajouter un congé",
        startDate: "Date de début",
        endDate: "Date de fin",
        vacationType: "Type de congé",
        scheduledVacations: "Congés programmés",
        loadingSettings: "Chargement des paramètres...",
        vacationsTypeVacation: "Vacances",
        vacationsTypeSick: "Congé maladie",
        vacationsTypePersonal: "Congé personnel",
        addButton: "Ajouter",
        noVacationsScheduled: "Aucun congé programmé",
        deleteVacation: "Supprimer",
        day: "jour",
        days: "jours",

        // Personal Info
        firstName: "Prénom",
        lastName: "Nom de famille",
        phoneNumber: "Numéro de téléphone",
        dateOfBirth: "Date de naissance",
        medicalHistory: "Antécédents médicaux",
        personalInformation: "Informations personnelles",
        savePersonalInfo: "Enregistrer les informations personnelles",
        address: "Adresse",
        emergencyContact: "Contact d'urgence",
        enterAddress: "Entrez votre adresse",
        enterEmergencyContact: "Entrez les informations de contact d'urgence",

        // Messages
        languageUpdated: "Langue mise à jour",
        languageChangedTo: "Langue changée en",
        themeUpdated: "Thème mis à jour",
        switchedToMode: "Basculé en mode",
        personalInfoSaved: "Informations personnelles enregistrées",
        personalInfoUpdated: "Vos informations ont été mises à jour avec succès.",
        informationConfirmed: "Informations Confirmées",
        changesSaved: "Modifications Enregistrées",
        privacyNotice:
            "Vos données personnelles et médicales sont protégées selon notre politique de confidentialité.",

        // Auth
        signOut: "Se déconnecter",
        signIn: "Connexion",
        signUp: "Inscription",
        createAccount: "Créer un compte",
        email: "Email",
        password: "Mot de passe",
        phone: "Téléphone",
        optional: "optionnel",
        welcome: "Bienvenue",
        accessCaberu: "Accès à Caberu",
        signInOrCreate: "Connectez-vous ou créez un compte pour commencer",
        signInButton: "Se connecter",
        createAccountButton: "Créer un compte",
        accountCreatedSuccess: "Compte créé avec succès !",
        checkEmailConfirm: "Vérifiez votre email pour confirmer votre compte.",
        signUpError: "Erreur lors de l'inscription",
        signInError: "Erreur lors de la connexion",
        signInSuccess: "Connexion réussie !",
        welcomeToCaberu: "Bienvenue sur Caberu.",
        myProfile: "Mon profil",
        about: "À propos",

        // Placeholders
        enterFirstName: "Entrez votre prénom",
        enterLastName: "Entrez votre nom de famille",
        enterPhoneNumber: "Entrez votre numéro de téléphone",
        enterMedicalHistory:
            "Entrez les antécédents médicaux pertinents, allergies, médicaments, etc.",
        selectLanguage: "Sélectionner la langue",
        enterEmail: "votre@email.com",
        enterPassword: "••••••••",

        // Dental Chat
        dentalAssistant: "Assistant dentaire",
        typeMessage: "Tapez votre message...",
        send: "Envoyer",
        welcomeMessage:
            "Bonjour ! Je suis Caberu. Comment puis-je vous aider aujourd'hui ? 🦷",
        detailedWelcomeMessage: "Bienvenue sur First Smile AI ! 🦷✨\n\nJe suis votre assistant dentaire IA, disponible 24h/24 pour vous aider avec :\n\n🤖 **Chat IA** - Obtenez des réponses instantanées à vos questions dentaires\n📅 **Réservation Intelligente** - Réservez des rendez-vous intelligemment avec les informations de durée\n📸 **Analyse Photo** - Téléchargez des photos pour une analyse dentaire alimentée par l'IA\n👨‍👩‍👧‍👦 **Soins Familiaux** - Réservez des rendez-vous pour vous ou les membres de votre famille\n\n💡 **Astuce Pro** : Dites-moi simplement ce qui vous dérange, et je vous guiderai à travers tout !\n\nComment puis-je vous aider aujourd'hui ?",
        detailedWelcomeMessageWithName: (
            name: string,
        ) => `Bienvenue sur First Smile AI ! 🦷✨\n\nBonjour ${name} ! Je suis votre assistant dentaire IA, disponible 24h/24 pour vous aider avec :\n\n🤖 **Chat IA** - Obtenez des réponses instantanées à vos questions dentaires\n📅 **Réservation Intelligente** - Réservez des rendez-vous intelligemment avec les informations de durée\n📸 **Analyse Photo** - Téléchargez des photos pour une analyse dentaire alimentée par l'IA\n👨‍👩‍👧‍👦 **Soins Familiaux** - Réservez des rendez-vous pour vous ou les membres de votre famille\n\n💡 **Astuce Pro** : Dites-moi simplement ce qui vous dérange, et je vous guiderai à travers tout !\n\nComment puis-je vous aider aujourd'hui ?`,

        // Landing page
        aiDiagnosisDesc: "Obtenez des évaluations instantanées alimentées par l'IA",
        smartBooking: "Réservation Intelligente",
        smartBookingDesc: "Réservez des rendez-vous intelligemment",
        support24_7: "Support 24h/24",
        support24_7Desc: "Assistance permanente",
        initializingExperience: "Initialisation de votre expérience",
        preparingAssistant:
            "Préparation de votre assistant dentaire personnalisé alimenté par une technologie IA avancée",

        // Navigation
        chat: "Chat",
        appointments: "Rendez-vous",

        // Appointment booking
        bookConsultationDescription:
            "Réservez votre consultation dentaire en quelques clics",
        chooseDentist: "Choisir un Dentiste",
        selectDate: "Sélectionner une Date",
        selectTime: "Sélectionner l'Heure",
        availableSlots: "Créneaux Disponibles",
        consultationReason: "Motif de Consultation",
        generalConsultation: "Consultation générale",
        routineCheckup: "Contrôle de routine",
        dentalPain: "Douleur dentaire",
        emergency: "Urgence",
        cleaning: "Nettoyage",
        other: "Autre",
        bookNow: "Réserver Maintenant",
        appointmentConfirmed: "Rendez-vous confirmé !",
        errorTitle: "Erreur",
        cannotLoadSlots: "Impossible de charger les créneaux disponibles",
        cannotLoadDentists: "Impossible de charger la liste des dentistes",
        missingInformation: "Informations manquantes",
        selectDentistDateTime:
            "Veuillez sélectionner un dentiste, une date et une heure",
        slotNoLongerAvailable: "Ce créneau n'est plus disponible",
        cannotCreateAppointment: "Impossible de créer le rendez-vous",

        // Appointments list
        myAppointments: "Mes Rendez-vous",
        appointmentHistory: "Historique des Rendez-vous",
        upcomingAppointments: "Rendez-vous à Venir",
        pastAppointments: "Rendez-vous Passés",
        newAppointment: "Nouveau",
        appointmentDetails: "Détails du Rendez-vous",
        loading: "Chargement...",
        noUpcomingAppointments: "Aucun rendez-vous à venir",
        noPastAppointments: "Aucun rendez-vous passé",
        noAppointmentsFound: "Aucun rendez-vous trouvé",
        viewMore: "Voir Plus",
        showLess: "Voir Moins",
        more: "plus",
        reschedule: "Reprogrammer",
        cancelAppointment: "Annuler",
        confirmCancellation: "Annuler le Rendez-vous",
        confirmCancellationMessage:
            "Êtes-vous sûr de vouloir annuler ce rendez-vous? Cette action est irréversible.",
        keepAppointment: "Conserver le Rendez-vous",
        yesCancelAppointment: "Oui, Annuler",
        appointmentCancelled: "Rendez-vous annulé avec succès",
        failedToCancelAppointment: "Échec de l'annulation du rendez-vous",

        // Appointments Management
        appointmentsManagement: "Gestion des Rendez-vous",
        manageViewAppointments: "Gérez et consultez tous les rendez-vous de vos patients",
        refresh: "Actualiser",
        searchByPatient: "Rechercher par nom de patient, motif ou notes...",
        todayPlus7Days: "Aujourd'hui + 7 jours",
        nextWeek: "Semaine Prochaine",
        nextMonth: "Mois Prochain",
        allTime: "Tout",
        thisWeek: "Cette Semaine",
        thisMonth: "Ce Mois",
        allStatus: "Tous les Statuts",
        pending: "En Attente",
        time: "Heure",
        patient: "Patient",
        status: "Statut",
        actions: "Actions",
        view: "Voir",
        notRegisteredDentist: "Vous n'êtes pas enregistré en tant que dentiste. Veuillez contacter le support.",
        contactSupport: "Contacter le Support",
        todaysAppointments: "Rendez-vous d'Aujourd'hui",
        urgentCases: "Cas Urgents",
        completionRate: "Taux de Complétion",
        highPriority: "Rendez-vous haute priorité",
        estimatedRevenue: "Revenu (Estimé)",
        avg: "Moy",
        statusOverview: "Aperçu des Statuts",
        generalConsultationLower: "Consultation générale",

        // Chat commands & integration
        showMyAppointments: "Voici vos rendez-vous :",
        nextAppointment: "Votre prochain rendez-vous est :",
        suggestedTime: (dentist: string, time: string) =>
            `Selon vos préférences, je suggère ${time} avec ${dentist}`,
        wouldYouLikeToBook: "Souhaitez-vous réserver ce rendez-vous ?",
        seeOtherOptions: "Voir d'autres options",
        appointmentSuggestion: (dentist: string, date: string, time: string) =>
            `📅 Disponible : ${date} à ${time} avec ${dentist}`,
        bookThisSlot: "Réserver ce créneau",
        showOtherTimes: "Afficher d'autres horaires",
        settingsUpdated: "Paramètres Mis à Jour",
        preferencesChanged: "Vos préférences ont été mises à jour",

        // Error handling
        microphoneError: "Erreur de Microphone",
        cameraError: "Erreur de Caméra",
        mediaAccessDenied:
            "L'accès aux médias a été refusé. Veuillez vérifier les paramètres de votre navigateur.",
        mediaNotSupported:
            "Les fonctionnalités multimédias ne sont pas prises en charge sur cet appareil.",
        tryAgain: "Réessayer",

        // Privacy & validation
        privacyPolicyLink: "Politique de Confidentialité",
        dataHandlingInfo:
            "Découvrez comment nous gérons vos données personnelles et médicales.",
        invalidPhoneFormat: "Veuillez entrer un numéro de téléphone valide",
        invalidEmailFormat: "Veuillez entrer une adresse email valide",
        requiredField: "Ce champ est obligatoire",
        consentHealthData: "Je consens à ce que Caberu traite mes données personnelles et de santé pour la prise de rendez-vous et le support des services dentaires.",
        childConsentNote: "Si vous saisissez des données pour un patient de moins de 16 ans, vous confirmez être son parent ou tuteur légal et consentez au traitement de ses données.",
        downloadMyData: "Télécharger Mes Données",
        deleteAccount: "Supprimer Mon Compte et Mes Données",
        deleteAccountConfirm: "La suppression de votre compte effacera définitivement toutes vos données personnelles et de santé des systèmes de Caberu. Cette action est irréversible. Êtes-vous sûr ?",
        aiAdviceDisclaimer: "⚠️ Les suggestions de l'IA sont fournies à titre informatif uniquement et ne remplacent pas les conseils dentaires professionnels.",

        // Onboarding
        welcomeToFirstSmile: "Bienvenue sur First Smile AI ! 🦷",
        yourAIDentalAssistant: "Votre Assistant Dentaire IA",
        onboardingIntro:
            "Je suis là pour vous aider avec tous vos besoins dentaires, 24h/24. Cette préversion montre comment First Smile AI fonctionnera dans le monde réel.",
        smartFeaturesService: "Fonctionnalités Intelligentes à Votre Service",
        aiChat: "Chat IA",
        aiChatDesc: "Obtenez des réponses instantanées aux questions dentaires",
        photoAnalysis: "Analyse Photo",
        photoAnalysisDesc: "Téléchargez des photos pour une analyse IA",
        familyCare: "Soins Familiaux",
        familyCareDesc: "Réservez aussi pour les membres de la famille",
        bookForFamilyTitle: "Réservez pour Toute Votre Famille",
        familyFriendlyBooking: "Réservation Familiale",
        bookForYourself: "Réservez des rendez-vous pour vous-même",
        bookForChildren: "Réservez pour vos enfants",
        bookForFamily: "Réservez pour les membres de la famille",
        alwaysTellDuration:
            "Je vous indiquerai toujours la durée du rendez-vous et l'heure de fin",
        readyToStart: "Prêt à Commencer ?",
        youreAllSet: "Vous êtes Prêt ! 🎉",
        onboardingEnd:
            "Commencez à discuter avec moi ci-dessous pour prendre des rendez-vous, poser des questions ou obtenir des conseils dentaires.",
        proTip: "💡 Astuce Pro :",
        proTipText:
            "Dites-moi simplement ce qui vous dérange, et je vous guiderai à travers tout !",
        letsStart: "Commençons !",
        next: "Suivant",
        back: "Retour",
        previewNotice:
            "Ceci est une préversion fonctionnelle de First Smile AI prête pour le monde réel.",
        aiDisclaimer:
            "Cet assistant utilise l'IA. Vérifiez toujours les conseils médicaux.",
        acceptTerms: "J'accepte les Conditions Générales",
        viewTerms: "Voir les Conditions",
        termsTitle: "Conditions Générales",
        termsIntro:
            "Veuillez lire attentivement ces conditions avant d'utiliser First Smile AI.",
        termsUse:
            "Utilisez ce service de manière responsable et respectez les autres.",
        termsPrivacy:
            "Nous traitons vos données conformément à notre politique de confidentialité.",
        termsMedical:
            "Consultez toujours un professional pour les problèmes médicaux sérieux.",

        // Language selection
        selectPreferredLanguage: "Sélectionnez Votre Langue Préférée",
        languageSelectionDescription:
            "Choisissez votre langue pour commencer avec First Smile AI",

        // Emergency Triage
        'triage.title': "Triage Dentaire d'Urgence",
        'triage.subtitle': 'Veuillez répondre aux questions suivantes pour évaluer votre niveau d\'urgence',
        'triage.pain.title': 'Évaluation de la Douleur',
        'triage.pain.question': 'Sur une échelle de 1-10, quelle est l\'intensité de votre douleur?',
        'triage.pain.none': 'Aucune douleur (1)',
        'triage.pain.severe': 'Douleur sévère (10)',
        'triage.symptoms.title': 'Symptômes Supplémentaires',
        'triage.symptoms.bleeding': 'Saignement des gencives ou des dents',
        'triage.symptoms.swelling': 'Gonflement du visage ou des gencives',
        'triage.symptoms.fever': 'Fièvre (>38°C)',
        'triage.symptoms.difficulty': 'Difficulté à avaler ou respirer',
        'triage.symptoms.trauma': 'Traumatisme dentaire récent ou blessure',
        'triage.duration.title': 'Durée des Symptômes',
        'triage.duration.question': 'Depuis combien de temps avez-vous ces symptômes?',
        'triage.duration.hours': 'Moins de 6 heures',
        'triage.duration.day': '6-24 heures',
        'triage.duration.days': '2-7 jours',
        'triage.duration.week': 'Plus d\'une semaine',
        'triage.medical.title': 'Antécédents Médicaux',
        'triage.medical.diabetes': 'Diabète',
        'triage.medical.heart': 'Maladie cardiaque',
        'triage.medical.blood': 'Troubles sanguins',
        'triage.medical.immune': 'Système immunitaire compromis',
        'triage.submit': 'Évaluer l\'Urgence et Prendre Rendez-vous',
        'triage.result.emergency': 'URGENCE - Attention immédiate requise',
        'triage.result.high': 'URGENCE ÉLEVÉE - Rendez-vous le jour même nécessaire',
        'triage.result.medium': 'URGENCE MOYENNE - Rendez-vous dans 2-3 jours',
        'triage.result.low': 'URGENCE FAIBLE - Rendez-vous régulier nécessaire',

        // Booking Triage
        'booking.title': 'Réserver Votre Rendez-vous',
        'booking.earliest': 'Créneaux Disponibles au Plus Tôt',
        'booking.confirm': 'Confirmer le Rendez-vous',
        'booking.success': 'Rendez-vous réservé avec succès!',
        'booking.detailsTitle': 'Détails du rendez-vous',
        'booking.dentist': 'Dentiste',
        'booking.date': 'Date',
        'booking.time': 'Heure',
        'booking.urgency': 'Urgence',
        'booking.urgentArrivalNotice': 'En raison du caractère urgent de votre cas, veuillez arriver 15 minutes en avance. Si votre état s’aggrave, contactez immédiatement les services d’urgence.',
        'booking.continue': 'Continuer vers le tableau de bord',
        'booking.selectDate': 'Sélectionner une date',
        'booking.availableTimes': 'Horaires disponibles',
        'booking.noSlots': 'Aucun créneau disponible pour cette date',
        'booking.selectDatePrompt': 'Veuillez sélectionner une date pour voir les horaires disponibles',
        'booking.selectedDentist': 'Dentiste sélectionné',
        'booking.selectedBadge': 'Sélectionné',

        // Emergency Triage Entry
        'entry.heroTitle': "Évaluation de Triage d'Urgence",
        'entry.heroDesc': 'Évaluation dentaire d’urgence rapide, sécurisée et précise',
        'entry.ctaStart': "Commencer l'évaluation d'urgence",
        'entry.steps.assessSymptoms.title': 'Évaluer les symptômes',
        'entry.steps.assessSymptoms.desc': 'Répondez aux questions sur votre douleur et vos symptômes',
        'entry.steps.getUrgency.title': "Obtenir le niveau d'urgence",
        'entry.steps.getUrgency.desc': 'Recevez votre niveau d’urgence (échelle 1-5)',
        'entry.steps.viewSlots.title': 'Voir les créneaux disponibles',
        'entry.steps.viewSlots.desc': 'Consultez les horaires de rendez-vous prioritaires',
        'entry.steps.bookInstantly.title': 'Réserver instantanément',
        'entry.steps.bookInstantly.desc': 'Confirmez votre rendez-vous immédiatement',
        'entry.emergencyNotice.title': 'Urgence vitale ?',
        'entry.emergencyNotice.desc': "Si vous avez de graves difficultés respiratoires, des saignements incontrôlables ou des signes d’infection grave, appelez immédiatement les services d’urgence (112).",
        'entry.gdpr.title': 'Confidentialité & Sécurité',
        'entry.gdpr.desc': 'Vos informations de santé sont protégées selon le RGPD. Les données sont chiffrées et uniquement partagées avec le dentiste sélectionné pour la prise de rendez-vous.',
        'entry.return': "Retour à l'application principale",
        'entry.stats.minutes': '2-3 minutes',
        'entry.stats.quick': 'Évaluation rapide',
        'entry.stats.gdpr': 'Conforme RGPD',
        'entry.stats.secure': 'Sécurisé & Privé',
        'entry.stats.directBooking': 'Réservation directe',
        'entry.stats.noChat': 'Sans chat requis',

        // Common
        'common.cancel': 'Annuler',
        'common.next': 'Suivant',
        'common.back': 'Retour',
        'common.loading': 'Chargement...',
        'common.success': 'Succès',

        // Appointment Details Dialog
        appointmentDetailsTitle: "Détails du Rendez-vous",
        appointmentInformation: "Informations du Rendez-vous",
        urgency: "urgence",
        reason: "Motif :",
        completed: "Terminé :",
        notes: "Notes",
        consultationNotes: "Notes de Consultation",
        additionalNotes: "Notes Supplémentaires",
        medicalRecords: "Dossiers Médicaux",
        prescriptions: "Prescriptions",
        billingInformation: "Informations de Facturation",
        findings: "Constatations :",
        recommendations: "Recommandations :",
        prescribed: "Prescrit :",
        invoice: "Facture",
        download: "Télécharger",
        patientAmount: "Montant Patient :",
        vat: "TVA :",
        total: "Total :",
        created: "Créé :",
        failedToLoadDetails: "Échec du chargement des détails du rendez-vous",

        // Patient Dashboard Components
        goodMorning: "Bonjour",
        goodAfternoon: "Bon après-midi",
        goodEvening: "Bonsoir",
        hereIsYourHealthOverview: "Voici votre aperçu santé",
        confirmed: "Confirmé",
        join: "Rejoindre",
        activeMedications: "Médicaments actifs",
        viewInCareTab: "Voir dans l'onglet Soins",
        balance: "Solde",
        due: "Dû",
        amountDue: "Montant dû",
        allPaid: "Tout payé",
        payNow: "Payer Maintenant",
        aiAssistant: "Assistant IA",
        getInstantHelpWith: "Obtenez une aide instantanée avec :",
        bookingAppointments: "Prise de rendez-vous",
        dentalQuestions: "Questions dentaires",
        emergencyTriage: "Triage d'urgence",
        startChat: "Commencer le Chat",
        dailyTipsReminders: "Conseils et Rappels Quotidiens",
        morningReminder: "Rappel Matinal",
        dontForgetToBrush: "N'oubliez pas de vous brosser les dents pendant 2 minutes",
        healthTip: "Conseil Santé",
        flossingDaily: "Utiliser le fil dentaire quotidiennement réduit les maladies des gencives de 40%",
        upcoming: "À venir",
        past: "Passé",
        book: "Réserver",
        dentalCleaningRecommended: "Nettoyage dentaire recommandé dans 2 mois",
        healthRecords: "Dossiers de Santé",
        rewards: "Récompenses",
        quicklyBookViewRecords: "Réservez rapidement, consultez les dossiers et gérez les paiements.",
        yourTreatmentsWillAppear: "Vos traitements et visites apparaîtront ici.",
        unpaid: "Impayé",
        paid: "Payé",
        statements: "Relevés",
        paidInvoices: "Vos factures payées apparaîtront ici.",
        downloadStatements: "Téléchargez les relevés mensuels.",
        viewManageMedications: "Consultez et gérez vos médicaments.",
        upload: "Téléverser",
        shareLink: "Partager le lien",
        insuranceProvider: "Fournisseur",
        insuranceProviderPlaceholder: "Mutualité / Nom de l'assurance",
        policyNumber: "Numéro de Police / ID Membre",
        policyNumberPlaceholder: "Numéro de police",
        healthStats: "Statistiques de Santé",
        healthRating: "Évaluation Santé",
        excellent: "Excellent",
        visitsThisYear: "Visites Cette Année",
        onTrack: "Sur la bonne voie",
        coverageUsed: "Couverture Utilisée",
        remaining: "restant",
        healthImproved: "Santé Améliorée",
        lastSixMonths: "6 derniers mois",
        treatmentPlans: "Plans de Traitement",
        manageDentalVisits: "Gérez vos visites dentaires",
        bookNew: "Nouveau",
        active: "Actif",
        mainClinic: "Clinique Principale",
        generalCheckup: "Contrôle Général",
        today: "Aujourd'hui",
        calendar: "Calendrier",
        list: "Liste",
        history: "Historique",
        cancelled: "Annulé",
        scheduled: "Programmé",

        // Dentist Dashboard
        loadingDentistDashboard: "Chargement du tableau de bord dentiste...",
        notRegisteredAsDentist: "Vous n'êtes pas enregistré comme dentiste. Veuillez contacter le support.",
        dentiDashboard: "Tableau de Bord Denti",
        dentistPortal: "Portail Dentiste",
        loadingDentistProfile: "Chargement du profil dentiste...",
        // AppShell & Navigation
        navClinical: "Clinique",
        navBusiness: "Business",
        navOperations: "Opérations",
        navAdmin: "Admin",
        navDashboard: "Tableau de bord",
        navAppointments: "Rendez-vous",
        navPatients: "Patients",
        navPayments: "Paiements",
        navAnalytics: "Analytique",
        navReports: "Rapports",
        navInventory: "Inventaire",
        navImport: "Import",
        navSchedule: "Planning",
        navSettings: "Paramètres",
        navBrandingLoc: "Image de marque & Localisation",
        navSecurity: "Confidentialité & Sécurité",
        topSearch: "Rechercher",
        topClinic: "Clinique",
        topProfile: "Profil",
        // Patient portal navigation (pnav.*)
        pnav: {
            group: {
                care: "Soins",
                billing: "Facturation",
                documents: "Documents",
                account: "Compte",
            },
            care: {
                home: "Accueil",
                appointments: "Rendez-vous",
                prescriptions: "Prescriptions",
                history: "Historique des soins",
            },
            billing: { main: "Factures & Paiements" },
            docs: { main: "Mes Documents" },
            account: {
                profile: "Profil & Paramètres",
                insurance: "Assurance / Mutualité",
                privacy: "Confidentialité & Sécurité",
                help: "Aide & Support",
            },
        },

        // Treatment records
        searchTreatments: "Rechercher des traitements...",
        filterByType: "Filtrer par type",
        allTypes: "Tous les types",
        consultation: "Consultation",
        treatment: "Traitement",
        xray: "Radiographie",
        labResult: "Résultat de Laboratoire",
        dentist: "Dentiste",
        treatmentType: "Type de Traitement",
        date: "Date",
        noRecordsFound: "Aucun dossier de traitement trouvé",
        appointmentRescheduled: "Rendez-vous reporté",
        savedSuccessfully: "Enregistré avec succès",

        // Dentist: Clinical appointment UI
        completeAppointment: "Terminer le Rendez-vous",
        prescriptionsShort: "Ordonnances",
        paymentsShort: "Paiements",
        viewAll: "Tout voir",
        collapse: "Réduire",
        expand: "Développer",
        srAlertNew: "Nouvelle alerte critique",
        srQuickActions: "Barre d'actions rapides",

        // Payment page
        paymentCancelled: "Paiement Annulé",
        paymentCancelledMessage: "Votre paiement a été annulé. Vous pouvez réessayer ou contacter votre dentiste si vous avez besoin d'aide.",
        closeWindow: "Fermer la Fenêtre",

        // Billing empty states
        billingNotAvailable: "Facturation Non Disponible",
        billingNotAvailableDesc: "Les demandes de paiement ne sont pas activées pour ce cabinet. Veuillez contacter votre prestataire pour les informations de paiement.",
        goToCareHome: "Aller à l'Accueil Soins",
        noPaidInvoices: "Aucune Facture Payée",
        noPaidInvoicesDesc: "Votre historique de paiement apparaîtra ici une fois que vous aurez effectué des paiements.",
        viewUnpaid: "Voir les Impayés",
        noStatementsAvailable: "Aucun Relevé Disponible",
        noStatementsDesc: "Vos relevés de facturation seront disponibles au téléchargement une fois générés.",
        managePaymentsDesc: "Gérez vos paiements, factures et relevés de facturation",
        amountDueLabel: "dû",

        // Settings pages
        profile: "Profil",
        services: "Services",
        hours: "Heures",
        appts: "RDV",
        team: "Équipe",
        brand: "Marque",
        billing: "Facturation",
        security: "Sécurité",
        scheduleAvailability: "Planning & Disponibilité",
        appointmentPreferences: "Préférences de rendez-vous",
        requireApprovalBefore: "Nécessite approbation avant confirmation",
        saveChanges: "Enregistrer les modifications",
        savingChanges: "Enregistrement...",
        staffManagement: "Gestion du Personnel",
        manageTeamMembers: "Gérez les membres de votre équipe et leurs accès",
        dangerZone: "Zone Dangereuse",

        // Security page
        securityAccess: "Sécurité & Accès",
        changePassword: "Changer le Mot de Passe",
        currentPassword: "Mot de Passe Actuel",
        newPassword: "Nouveau Mot de Passe",
        confirmNewPassword: "Confirmer le Nouveau Mot de Passe",
        updatePassword: "Mettre à Jour le Mot de Passe",
        updating: "Mise à jour...",
        passwordUpdated: "Mot de Passe Mis à Jour",
        twoFactorAuth: "Authentification à Deux Facteurs",

        // Branding page
        brandingSettings: "Paramètres de Marque",
        branding: "Marque",
        clinicInformation: "Informations du Cabinet",
        uploadLogo: "Téléverser le Logo",
        clinicName: "Nom du Cabinet",
        tagline: "Slogan",
        copyLink: "Copier le Lien",
        linkCopied: "Lien copié !",
        showQrCode: "Afficher QR",
        downloadQr: "Télécharger QR",
        settingsSaved: "Paramètres Enregistrés",

        // Profile page
        profileInformation: "Informations du Profil",
        specialization: "Spécialisation",
        clinicAddress: "Adresse du Cabinet",
        professionalBio: "Biographie Professionnelle",
        profileUpdated: "Profil mis à jour avec succès",
        specializationPlaceholder: "Dentisterie Générale, Orthodontie, etc.",
        clinicAddressPlaceholder: "123 Rue Principale, Ville, Code Postal",
        bioPlaceholder: "Parlez aux patients de vous, de votre expérience et de vos spécialisations...",
        profileInfoDesc: "Mettez à jour vos informations personnelles et professionnelles",

        // Dashboard & Portal
        todaysSchedule: "Planning d'Aujourd'hui",
        completedThisWeek: "Terminé Cette Semaine",
        noAppointmentsToday: "Aucun rendez-vous aujourd'hui",
        noAppointmentsTodayDesc: "Vous n'avez aucun rendez-vous prévu pour aujourd'hui. Profitez-en pour rattraper d'autres tâches ou planifier de nouveaux rendez-vous.",
        viewAllAppointments: "Voir Tous les Rendez-vous",
        scheduleNew: "Planifier Nouveau",
        unknownPatient: "Patient Inconnu",
        urgent: "Urgent",
        noReasonSpecified: "Aucun motif spécifié",

        // Messages Page
        signInToMessage: "Connectez-vous pour Envoyer des Messages",
        needSignedInToMessage: "Vous devez être connecté pour envoyer et recevoir des messages",
        selectConversation: "Sélectionnez une conversation",

        // Patient Management
        selectPatient: "Sélectionner un Patient",
        findPatient: "Rechercher un patient...",
        addNewPatient: "Ajouter un Nouveau Patient",
        overview: "Aperçu",
        clinical: "Clinique",
        schedule: "Planning",
        financial: "Financier",
        years: "ans",
        yearsOld: "ans",
        medicalAlert: "Alerte Médicale",
        unpaidBalance: "Solde Impayé",
        quickActions: "Actions Rapides",
        createPayment: "Créer un Paiement",
        addTreatmentPlan: "Ajouter un Plan de Traitement",
        addQuickNote: "Ajouter une Note Rapide",
        exportPdf: "Exporter en PDF",
        searchNotesAppointmentsTreatments: "Rechercher notes, rendez-vous, traitements...",
        patientTimeline: "Chronologie du Patient",
        noPatientsYet: "Aucun patient pour le moment",
        appointmentCompleted: "Rendez-vous terminé",
        appointmentCancelledToast: "Rendez-vous annulé",
        patientNotifiedByEmail: "Le patient a été notifié par email",
        appointmentConfirmedToast: "Rendez-vous confirmé",
        noteAdded: "Note ajoutée",
        treatmentPlanCreated: "Plan de traitement créé",
        treatmentPlanDeleted: "Plan de traitement supprimé",
        clickUndoToRestore: "Cliquez sur annuler pour restaurer",
        appointmentDeleted: "Rendez-vous supprimé",
        noteDeleted: "Note supprimée",
        treatmentPlanRestored: "Plan de traitement restauré",
        appointmentRestored: "Rendez-vous restauré",
        noteRestored: "Note restaurée",
        appointmentLinked: "Rendez-vous lié",
        linkedTo: "Lié à",
        noEmail: "Pas d'email",
        patientHasNoEmail: "Le patient n'a pas d'adresse email",
        patientUpdated: "Patient mis à jour",
        enterTitle: "Veuillez entrer un titre",
        failedToCreateTreatmentPlan: "Échec de la création du plan de traitement",
        failedToUpdatePatient: "Échec de la mise à jour du patient",
        failedToDeleteTreatmentPlan: "Échec de la suppression du plan de traitement",
        failedToDeleteAppointment: "Échec de la suppression du rendez-vous",
        failedToDeleteNote: "Échec de la suppression de la note",
        failedToRestoreTreatmentPlan: "Échec de la restauration du plan de traitement",
        failedToRestoreAppointment: "Échec de la restauration du rendez-vous",
        failedToRestoreNote: "Échec de la restauration de la note",
        failedToLinkAppointment: "Échec du lien du rendez-vous",
        failedToAddNote: "Échec de l'ajout de la note",
        deleteTreatmentPlan: "Supprimer le Plan de Traitement",
        deleteAppointment: "Supprimer le Rendez-vous",
        confirmDeleteTreatmentPlan: "Êtes-vous sûr de vouloir supprimer ce plan de traitement ?",
        confirmDeleteAppointment: "Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ?",
        confirmDeleteSelected: "Êtes-vous sûr de vouloir supprimer les éléments sélectionnés ?",
        itemsDeleted: "éléments supprimés",
        undo: "Annuler",

        // Patient Management - New Keys
        totalPlans: "plans total",
        done: "Terminé",
        newTreatmentPlan: "Nouveau Plan de Traitement",
        treatmentTitlePlaceholder: "Titre du traitement...",
        diagnosisPlaceholder: "Diagnostic...",
        descriptionOptional: "Description (optionnel)",
        lowPriority: "Priorité Basse",
        normal: "Normal",
        estCost: "Coût Est. €",
        targetDate: "Date Cible",
        create: "Créer",
        noAppointmentsLinked: "Aucun rendez-vous lié à ce traitement pour le moment",
        selectTreatmentOrAppointment: "Sélectionnez un traitement ou un rendez-vous dans la barre latérale",
        totalAppointments: "rendez-vous total",
        moreAppointments: "rendez-vous de plus",
        financialLedger: "Grand Livre Financier",
        emailSummary: "Envoyer le Résumé par Email",
        scheduleNow: "Planifier maintenant",
        recentActivity: "Activité Récente",
        noRecentActivity: "Aucune activité récente",
        patientNotes: "Notes du Patient",
        totalNotes: "notes en tout",
        noNotesYet: "Aucune note pour le moment",
        addNoteAbove: "Ajoutez une note ci-dessus pour commencer",
        noAppointmentsLinkedShort: "Aucun rendez-vous lié",
        noTreatmentPlansYet: "Aucun plan de traitement",
        compareImages: "Comparer les Images",
        selectAnImage: "Sélectionnez une image",
        selectImagesToCompare: "Sélectionnez les images à comparer :",
        compare: "Comparer",
        addNotesPlaceholder: "Ajouter des notes...",
        images: "Images",
        add: "Ajouter",
        clickToAddImages: "Cliquez pour ajouter des images",
        noTreatmentPlanLinked: "Aucun plan de traitement lié",
        noDescription: "Pas de description",
        linkedAppointments: "Rendez-vous liés",
        appointmentsForThisTreatment: "Rendez-vous pour ce traitement",

        // Settings pages extended
        approveNewPatientRequests: "Approuver les demandes de nouveaux patients pour éviter les doubles réservations.",
        manualReviewRequired: "Révision manuelle requise",
        requestsAutoConfirmed: "Demandes auto-confirmées",
        saveImmediately: "Enregistrez les modifications pour que les patients voient immédiatement les nouvelles règles.",
        irreversibleActions: "Actions irréversibles affectant votre adhésion à la clinique",
        leaveClinic: "Quitter la Clinique",
        loseAccessWarning: "Vous perdrez l'accès à toutes les données et rendez-vous de la clinique.",
        lastMemberWarning: "Si vous êtes le dernier membre, l'entreprise sera définitivement supprimée.",
        leaveClinicConfirm: "Cette action est irréversible. Vous perdrez l'accès à toutes les données, rendez-vous et dossiers patients.",
        enterPasswordConfirm: "Entrez votre mot de passe pour confirmer",
        yourPassword: "Votre mot de passe",
        leaving: "Départ en cours...",
        businessDeleted: "Entreprise supprimée",
        lastMemberDeletedDesc: "Vous étiez le dernier membre. L'entreprise a été définitivement supprimée.",
        leftClinic: "Clinique quittée",
        stillBelongOther: "Vous avez quitté la clinique. Vous appartenez toujours à d'autres cliniques.",
        leftRoleRemoved: "Vous avez quitté la clinique et votre rôle de prestataire a été supprimé.",
        passwordRequired: "Mot de passe requis",
        enterPasswordLeave: "Veuillez entrer votre mot de passe pour confirmer votre départ de la clinique.",
        couldntLoadSettings: "Impossible de charger les paramètres de rendez-vous",
        refreshOrTryAgain: "Veuillez rafraîchir la page ou réessayer dans un moment.",
        couldntSaveSettings: "Impossible d'enregistrer les paramètres de rendez-vous",
        appointmentRulesUpdated: "Règles de rendez-vous mises à jour",
        rulesUpdatedDesc: "Les patients verront immédiatement les nouvelles règles d'approbation.",
        loadingPortal: "Chargement du portail...",
        accessDenied: "Accès Refusé",
        startTour: "Démarrer la Visite",
        reportsComingSoon: "Rapports (Bientôt Disponible)",
        sectionNotFound: "Section introuvable",
        clinicalNotAvailable: "Fonctionnalités cliniques non disponibles pour ce type d'entreprise",
        paymentNotAvailable: "Fonctionnalités de paiement non disponibles",

        // Branding page extended
        brandingSubtitle: "Personnalisez l'apparence de votre entreprise, les services et le comportement de l'IA",
        aiAssistantConfig: "Assistant IA",
        templates: "Modèles",
        emailTemplates: "Email",
        payments: "Paiements",
        businessLinkQr: "Lien Entreprise & QR Code",
        logoUploadDesc: "Téléversez le logo de votre clinique (max 2Mo)",
        chooseLogo: "Choisir le Logo",
        logoUploaded: "Logo Téléversé",
        logoUploadedDesc: "Le logo de votre clinique a été téléversé avec succès",
        invalidFile: "Fichier Invalide",
        uploadImageFile: "Veuillez téléverser un fichier image",
        fileTooLarge: "Fichier Trop Volumineux",
        logoSizeLimit: "Le logo doit faire moins de 2Mo",
        uploadFailed: "Échec du Téléversement",
        businessSlug: "Identifiant Entreprise",
        slugCannotContain: "L'identifiant ne peut pas contenir",
        forwardSlashes: "les barres obliques",
        spaces: "les espaces",
        onlyOneDot: "L'identifiant ne peut contenir qu'un seul point",
        linkCopiedDesc: "Le lien entreprise a été copié dans le presse-papiers",
        failedToCopy: "Échec de la copie",
        couldNotCopyLink: "Impossible de copier le lien dans le presse-papiers",
        qrDownloaded: "QR Code Téléchargé",
        qrDownloadedDesc: "Le QR code de votre lien entreprise a été téléchargé",
        downloadFailed: "Échec du Téléchargement",
        qrDownloadFailed: "Nous n'avons pas pu télécharger le QR code. Veuillez réessayer.",
        settingsSavedDesc: "Vos paramètres de marque ont été enregistrés avec succès. Tous les changements sont maintenant actifs !",
        templateSwitched: "Modèle Changé avec Succès",
        templateSwitchedDesc: "Votre entreprise utilise maintenant le",
        template: "modèle",
        saveFailed: "Échec de l'Enregistrement",
        businessTemplate: "Modèle d'Entreprise",
        changeTemplate: "Changer de Modèle",
        templateWarning: "Changer de modèle réinitialisera vos paramètres de comportement IA aux valeurs par défaut du nouveau modèle.",
        confirmTemplateChange: "Confirmer le Changement",
        testAi: "Tester l'IA",

        // Security page extended
        securitySubtitle: "Gérez les paramètres de sécurité et l'accès de l'équipe",
        changePasswordDesc: "Mettez régulièrement à jour votre mot de passe pour sécuriser votre compte",
        enterCurrentPassword: "Entrez le mot de passe actuel",
        enterNewPasswordMin: "Entrez le nouveau mot de passe (min 8 caractères)",
        confirmPasswordPlaceholder: "Confirmez le nouveau mot de passe",
        passwordsDontMatch: "Les Mots de Passe ne Correspondent Pas",
        passwordsDontMatchDesc: "Veuillez vous assurer que vos nouveaux mots de passe correspondent",
        passwordTooShort: "Mot de Passe Trop Court",
        passwordMinLength: "Le mot de passe doit contenir au moins 8 caractères",
        passwordUpdatedDesc: "Votre mot de passe a été modifié avec succès. Un email de confirmation a été envoyé.",
        twoFactorAuthDesc: "Ajoutez une couche de sécurité supplémentaire à votre compte",
        enable2fa: "Activer l'A2F",
        require2faCode: "Exiger un code de vérification en plus de votre mot de passe",
        twoFaDisabled: "A2F Désactivée",
        twoFaDisabledDesc: "L'authentification à deux facteurs a été désactivée",
        twoFaEnabled: "L'authentification à deux facteurs est activée. Vous recevrez un code de vérification par email lors de la connexion.",
        staffRoles: "Personnel & Rôles",
        staffRolesDesc: "Gérez les membres de l'équipe et leurs niveaux d'accès",
        noStaffYet: "Aucun membre du personnel ajouté",
        dataPrivacy: "Données & Confidentialité",
        dataPrivacyDesc: "Gérez vos paramètres de données et de confidentialité",
        exportYourData: "Exporter Vos Données",
        exportDataDesc: "Téléchargez toutes vos données personnelles dans un format portable",
        exportData: "Exporter les Données",
        exporting: "Exportation...",
        exportStarted: "Exportation Démarrée",
        exportStartedDesc: "L'exportation de vos données a été lancée. Vous recevrez un email quand elle sera prête.",
        exportFailed: "Échec de l'Exportation",
        deleteYourAccount: "Supprimer Votre Compte",
        deleteAccountDesc: "Supprimez définitivement votre compte et toutes les données associées",
        deleteAccountWarningDesc: "Cette action est irréversible. Toutes vos données seront définitivement supprimées.",
        confirmDeleteAccount: "Je comprends que c'est permanent",
        deleting: "Suppression...",
        accountDeleted: "Compte Supprimé",
        accountDeletedDesc: "Votre compte a été définitivement supprimé.",
        deleteFailed: "Échec de la Suppression",

        // Users page
        teamMembers: "Membres de l'Équipe",
        teamMembersDesc: "Gérez le personnel et les patients de votre clinique",
        totalUsers: "Total Utilisateurs",
        activeUsers: "Utilisateurs Actifs",
        pendingInvites: "Invitations en Attente",
        admins: "Administrateurs",
        userList: "Liste des Utilisateurs",
        userListDesc: "Recherchez et gérez tous les utilisateurs du système",
        searchByNameEmailRole: "Rechercher par nom, email ou rôle...",
        name: "Nom",
        roles: "Rôles",
        joined: "Inscrit",
        noUsersFound: "Aucun utilisateur trouvé",
        noRolesAssigned: "Aucun rôle assigné",
        invitationPending: "Invitation en Attente",
        inactive: "Inactif",

        // Appointment actions
        noAppointmentsYet: "Vous n'avez pas encore de rendez-vous.",
        bookFirstAppointment: "Réservez Votre Premier Rendez-vous",
        confirmReschedule: "Confirmer le Report",
        rescheduleAppointment: "Reporter le Rendez-vous",
        newDate: "Nouvelle Date",
        newTime: "Nouvelle Heure",
        bookNewAppointment: "Réserver un Nouveau Rendez-vous",
        selectAPatient: "Sélectionner un patient",
        reasonForVisit: "Motif de la Visite",
        durationMinutes: "Durée (minutes)",
        fillRequiredFields: "Veuillez remplir tous les champs obligatoires",
        appointmentBookedDesc: "Le rendez-vous a été réservé avec succès.",
        cancelAppointmentTitle: "Annuler le Rendez-vous",
        cancelAppointmentConfirm: "Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.",
        goBack: "Retour",
        all: "Tous",

        // Availability settings
        availabilitySettings: "Paramètres de Disponibilité",
        manageWorkingHours: "Gérez vos heures de travail et votre planning",
        loadingAvailability: "Chargement des paramètres de disponibilité...",
        failedToFetchAvailability: "Échec du chargement des disponibilités",
        quickSchedulePresets: "Préréglages Rapides de Planning",
        standardWeek: "Semaine Standard",
        standardWeekDesc: "Lundi au Vendredi, 9h - 17h",
        extendedHours: "Heures Prolongées",
        extendedHoursDesc: "Lundi au Samedi, 8h - 18h",
        partTime: "Temps Partiel",
        partTimeDesc: "Mardi, Jeudi, Samedi uniquement",
        presetApplied: "Préréglage Appliqué",
        scheduleApplied: "le planning a été appliqué",
        saveSettings: "Enregistrer les Paramètres",
        workingDays: "Jours de Travail",
        totalHoursWeek: "Heures/Semaine",
        currentStatus: "Statut Actuel",
        available: "Disponible",
        unavailable: "Indisponible",
        makeAllDaysAvailable: "Rendre Tous les Jours Disponibles",
        makeAllDaysUnavailable: "Rendre Tous les Jours Indisponibles",
        weekdaysOnly: "Jours Ouvrables Uniquement (Lun-Ven)",
        weekendsOnly: "Week-ends Uniquement (Sam-Dim)",
        availabilitySaved: "Paramètres de disponibilité enregistrés",
        failedToSave: "Échec de l'enregistrement des disponibilités",
    },
    nl: {
        // Error & status messages
        error: "Fout",
        success: "Succes",
        microphoneAccessError:
            "Kan geen toegang krijgen tot de microfoon. Controleer je browserrechten en probeer het opnieuw.",
        transcriptionFailed:
            "Transcriptie van spraak mislukt. Probeer het opnieuw of typ je bericht.",
        voiceProcessingError: "Fout bij het verwerken van het spraakbericht. Probeer het opnieuw.",

        // General
        settings: "Instellingen",
        general: "Algemeen",
        theme: "Thema",
        personal: "Persoonlijk",
        intelligentDentalAssistant: "Intelligente tandartsassistent",
        experienceFuture: "Ervaar de toekomst",
        viewOurDentists: "Bekijk onze tandartsen",
        aiDiagnosis: "AI-diagnose",
        startConsultation: "Consult starten",
        bookAppointment: "Afspraak boeken",
        emergencyAssistance: "Noodhulp",
        language: "Voorkeurstaal",
        patientPortal: "Patiëntenportaal",
        classicBooking: "Klassieke boeking",
        clinicLogoAlt: "Klinieklogo",
        openMenu: "Menu openen",
        collapseExpandSidebar: "Zijbalk in- of uitklappen",
        toggleSidebar: "Zijbalk schakelen",
        light: "Licht",
        dark: "Donker",
        save: "Opslaan",
        confirm: "Bevestigen",
        cancel: "Annuleren",
        close: "Sluiten",
        retry: "Opnieuw proberen",

        // Booking & schedule additions
        selectDentist: "Kies tandarts",
        selectAppointmentType: "Kies afspraaktype",
        appointmentType: "Afspraaktype",
        confirmBooking: "Boeking bevestigen",
        booking: "Boeken...",
        bookAppointmentDescription: "Boek je tandartsafspraak in een paar klikken",
        describeSymptoms: "Beschrijf je klachten of zorgen...",
        noSlotsAvailable: "Geen tijden beschikbaar voor deze datum",
        unableToLoadSlots: "Kan beschikbare tijden niet laden",
        unableToBookAppointment: "Kan afspraak niet boeken",
        pleaseCompleteAllFields: "Vul alle verplichte velden in",
        incompleteProfile: "Profiel onvolledig",
        pleaseCompleteProfileFirst:
            "Vul eerst je profiel in bij de instellingen voordat je een afspraak boekt",
        appointmentBooked: "Afspraak succesvol geboekt",
        weeklyAvailability: "Wekelijkse beschikbaarheid",
        workingHours: "Werkuren",
        breakTime: "Pauzetijd",
        saveAvailability: "Beschikbaarheid opslaan",
        availabilityUpdated: "Beschikbaarheid bijgewerkt",
        failedToLoadAvailability: "Laden van beschikbaarheid mislukt",
        failedToSaveAvailability: "Opslaan van beschikbaarheid mislukt",
        saving: "Opslaan...",
        monday: "Maandag",
        tuesday: "Dinsdag",
        wednesday: "Woensdag",
        thursday: "Donderdag",
        friday: "Vrijdag",
        saturday: "Zaterdag",
        sunday: "Zondag",

        // Messages
        languageUpdated: "Taal bijgewerkt",
        languageChangedTo: "Taal gewijzigd naar",
        themeUpdated: "Thema bijgewerkt",
        switchedToMode: "Overgeschakeld naar",
        personalInfoSaved: "Persoonlijke informatie opgeslagen",
        personalInfoUpdated: "Je gegevens zijn succesvol bijgewerkt.",
        informationConfirmed: "Informatie bevestigd",
        changesSaved: "Wijzigingen opgeslagen",
        privacyNotice:
            "Je persoonlijke en medische gegevens worden beschermd volgens ons privacybeleid.",

        // Auth
        signOut: "Afmelden",
        signIn: "Aanmelden",
        signUp: "Registreren",
        createAccount: "Account aanmaken",
        email: "E-mail",
        password: "Wachtwoord",
        phone: "Telefoon",
        optional: "optioneel",
        welcome: "Welkom",
        accessCaberu: "Toegang tot Caberu",
        signInOrCreate: "Meld je aan of maak een account om te beginnen",
        signInButton: "Aanmelden",
        createAccountButton: "Account maken",
        accountCreatedSuccess: "Account succesvol aangemaakt!",
        checkEmailConfirm: "Controleer je e-mail om je account te bevestigen.",
        signUpError: "Fout bij registreren",
        signInError: "Fout bij aanmelden",
        signInSuccess: "Succesvol aangemeld!",
        welcomeToCaberu: "Welkom bij Caberu.",
        myProfile: "Mijn profiel",
        about: "Over",

        // Placeholders
        enterFirstName: "Voer je voornaam in",
        enterLastName: "Voer je achternaam in",
        enterPhoneNumber: "Voer je telefoonnummer in",
        enterMedicalHistory: "Vul relevante medische geschiedenis, allergieën, medicatie, enz. in.",
        selectLanguage: "Selecteer taal",
        enterEmail: "jij@email.com",
        enterPassword: "••••••••",

        // Dental Chat
        dentalAssistant: "Tandartsassistent",
        typeMessage: "Typ je bericht...",
        send: "Verzenden",
        welcomeMessage: "Hallo! Ik ben Caberu. Hoe kan ik je vandaag helpen? 🦷",
        detailedWelcomeMessage:
            "Welkom bij First Smile AI! 🦷✨\n\nIk ben je AI-tandartsassistent, 24/7 beschikbaar om je te helpen met:\n\n🤖 **AI-chat** - Krijg direct antwoord op je tandheelkundige vragen\n📅 **Slim boeken** - Boek afspraken intelligent met duurinformatie\n📸 **Foto-analyse** - Upload foto's voor AI-gestuurde tandheelkundige analyse  \n👨‍👩‍👧‍👦 **Gezinszorg** - Maak afspraken voor jezelf of gezinsleden\n\n💡 **Pro tip**: Vertel gewoon wat er aan de hand is, dan begeleid ik je door alles!\n\nWaarmee kan ik je helpen?",
        detailedWelcomeMessageWithName: (
            name: string,
        ) =>
            `Welkom bij First Smile AI! 🦷✨\n\nHallo ${name}! Ik ben je AI-tandartsassistent, 24/7 beschikbaar om je te helpen met:\n\n🤖 **AI-chat** - Krijg direct antwoord op je tandheelkundige vragen\n📅 **Slim boeken** - Boek afspraken intelligent met duurinformatie\n📸 **Foto-analyse** - Upload foto's voor AI-gestuurde tandheelkundige analyse  \n👨‍👩‍👧‍👦 **Gezinszorg** - Maak afspraken voor jezelf of gezinsleden\n\n💡 **Pro tip**: Vertel gewoon wat er aan de hand is, dan begeleid ik je door alles!\n\nWaarmee kan ik je helpen?`,

        // Landing page
        aiDiagnosisDesc: "Ontvang direct AI-gestuurde beoordelingen",
        smartBooking: "Slim boeken",
        smartBookingDesc: "Plan afspraken intelligent",
        support24_7: "24/7 ondersteuning",
        support24_7Desc: "Hulp rond de klok",
        initializingExperience: "Ervaring wordt voorbereid",
        preparingAssistant:
            "Je persoonlijke tandartsassistent wordt voorbereid met geavanceerde AI-technologie",

        // Navigation
        chat: "Chat",
        appointments: "Afspraken",

        // Appointment booking
        bookConsultationDescription: "Plan je tandartsconsult in enkele klikken",
        chooseDentist: "Kies tandarts",
        selectDate: "Selecteer datum",
        selectTime: "Selecteer tijd",
        availableSlots: "Beschikbare tijden",
        consultationReason: "Reden van consult",
        generalConsultation: "Algemeen consult",
        routineCheckup: "Periodieke controle",
        dentalPain: "Tandpijn",
        emergency: "Noodgeval",
        cleaning: "Reiniging",
        other: "Anders",
        bookNow: "Nu boeken",
        appointmentConfirmed: "Afspraak bevestigd!",
        errorTitle: "Fout",
        cannotLoadSlots: "Kan beschikbare tijden niet laden",
        cannotLoadDentists: "Kan lijst met tandartsen niet laden",
        missingInformation: "Informatie ontbreekt",
        selectDentistDateTime: "Selecteer een tandarts, datum en tijd",
        slotNoLongerAvailable: "Dit tijdslot is niet meer beschikbaar",
        cannotCreateAppointment: "Kan afspraak niet aanmaken",

        // Appointments list
        myAppointments: "Mijn afspraken",
        appointmentHistory: "Afsprakenhistorie",
        upcomingAppointments: "Aankomende afspraken",
        pastAppointments: "Afgelopen afspraken",
        newAppointment: "Nieuw",
        appointmentDetails: "Afspraakdetails",
        loading: "Laden...",
        noUpcomingAppointments: "Geen aankomende afspraken",
        noPastAppointments: "Geen eerdere afspraken",
        noAppointmentsFound: "Geen afspraken gevonden",
        viewMore: "Meer weergeven",
        showLess: "Minder tonen",
        more: "meer",
        reschedule: "Verzetten",
        cancelAppointment: "Annuleren",
        confirmCancellation: "Afspraak annuleren",
        confirmCancellationMessage:
            "Weet je zeker dat je deze afspraak wilt annuleren? Deze actie kan niet ongedaan worden gemaakt.",
        keepAppointment: "Afspraak behouden",
        yesCancelAppointment: "Ja, annuleren",
        appointmentCancelled: "Afspraak succesvol geannuleerd",
        failedToCancelAppointment: "Het annuleren van de afspraak is mislukt",

        // Appointments Management
        appointmentsManagement: "Afsprakenbeheer",
        manageViewAppointments: "Beheer en bekijk al je patiëntafspraken",
        refresh: "Verversen",
        searchByPatient: "Zoek op patiëntnaam, reden of notities...",
        todayPlus7Days: "Vandaag + 7 dagen",
        nextWeek: "Volgende week",
        nextMonth: "Volgende maand",
        allTime: "Alle periodes",
        thisWeek: "Deze week",
        thisMonth: "Deze maand",

        // Error handling
        microphoneError: "Microfoonfout",
        cameraError: "Camera fout",
        mediaAccessDenied: "Toegang tot media geweigerd",
        mediaNotSupported: "Media niet ondersteund",
        tryAgain: "Probeer opnieuw",

        // Privacy & validation
        privacyPolicyLink: "Zie ons privacybeleid",
        dataHandlingInfo: "We beschermen je gegevens volgens de GDPR-richtlijnen.",
        invalidPhoneFormat: "Ongeldig telefoonnummer",
        invalidEmailFormat: "Ongeldig e-mailadres",
        requiredField: "Verplicht veld",
        consentHealthData: "Ik geef toestemming aan Caberu om mijn persoonlijke en gezondheidsgegevens te verwerken voor het plannen van afspraken en ondersteuning van tandheelkundige diensten.",
        childConsentNote: "Als je gegevens invoert voor een patiënt jonger dan 16 jaar, bevestig je dat je hun ouder of wettelijke voogd bent en toestemming geeft voor de verwerking van hun gegevens.",
        downloadMyData: "Mijn Gegevens Downloaden",
        deleteAccount: "Mijn Account & Gegevens Verwijderen",
        deleteAccountConfirm: "Het verwijderen van je account zal al je persoonlijke en gezondheidsgegevens permanent verwijderen uit de systemen van Caberu. Dit kan niet ongedaan worden gemaakt. Weet je het zeker?",
        aiAdviceDisclaimer: "⚠️ AI-suggesties zijn alleen ter informatie en vervangen geen professioneel tandheelkundig advies.",

        // Language selection
        selectPreferredLanguage: "Kies je voorkeurstaal",
        languageSelectionDescription: "Pas de ervaring aan je taalvoorkeur aan.",

        // Personal Info
        firstName: "Voornaam",
        lastName: "Achternaam",
        phoneNumber: "Telefoonnummer",
        dateOfBirth: "Geboortedatum",
        medicalHistory: "Medische Geschiedenis",
        personalInformation: "Persoonlijke Informatie",
        savePersonalInfo: "Persoonlijke Informatie Opslaan",
        address: "Adres",
        emergencyContact: "Noodcontact",
        enterAddress: "Voer je adres in",
        enterEmergencyContact: "Voer noodcontactinformatie in",

        // Vacation & Schedule Management
        availabilityManagement: "Beschikbaarheidsbeheer",
        weeklySchedule: "Weekrooster",
        vacationsAbsences: "Vakanties & Afwezigheden",
        weeklyPlanning: "Wekelijkse Planning",
        quickPresets: "Snelle presets:",
        presetMonFri: "Ma-Vr 9:00-17:00",
        presetMonSat: "Ma-Za 8:00-18:00",
        startTime: "Start",
        endTime: "Einde",
        breakStart: "Pauze start",
        breakEnd: "Pauze einde",
        addVacation: "Vakantie Toevoegen",
        startDate: "Startdatum",
        endDate: "Einddatum",
        vacationType: "Type vakantie",
        scheduledVacations: "Geplande vakanties",
        loadingSettings: "Instellingen laden...",
        vacationsTypeVacation: "Vakantie",
        vacationsTypeSick: "Ziekteverlof",
        vacationsTypePersonal: "Persoonlijk verlof",
        addButton: "Toevoegen",
        noVacationsScheduled: "Geen vakanties gepland",
        deleteVacation: "Verwijderen",
        day: "dag",
        days: "dagen",

        // Chat commands & integration
        showMyAppointments: "Hier zijn je afspraken:",
        nextAppointment: "Je volgende afspraak is:",
        suggestedTime: (dentist: string, time: string) =>
            `Op basis van je voorkeuren stel ik ${time} voor met ${dentist}`,
        wouldYouLikeToBook: "Wil je deze afspraak boeken?",
        seeOtherOptions: "Andere opties bekijken",
        appointmentSuggestion: (dentist: string, date: string, time: string) =>
            `📅 Beschikbaar: ${date} om ${time} met ${dentist}`,
        bookThisSlot: "Dit tijdslot boeken",
        showOtherTimes: "Andere tijden tonen",
        settingsUpdated: "Instellingen Bijgewerkt",
        preferencesChanged: "Je voorkeuren zijn bijgewerkt",

        // Onboarding
        welcomeToFirstSmile: "Welkom bij First Smile AI! 🦷",
        yourAIDentalAssistant: "Je AI Tandartsassistent",
        onboardingIntro: "Ik ben hier om je te helpen met al je tandheelkundige behoeften, 24/7. Deze preview laat zien hoe First Smile AI in de praktijk werkt.",
        smartFeaturesService: "Slimme Functies tot Je Dienst",
        aiChat: "AI Chat",
        aiChatDesc: "Krijg direct antwoord op tandheelkundige vragen",
        photoAnalysis: "Foto Analyse",
        photoAnalysisDesc: "Upload foto's voor AI-analyse",
        familyCare: "Gezinszorg",
        familyCareDesc: "Boek ook voor familieleden",
        bookForFamilyTitle: "Boek voor Iedereen in Je Familie",
        familyFriendlyBooking: "Gezinsvriendelijk Boeken",
        bookForYourself: "Boek afspraken voor jezelf",
        bookForChildren: "Boek voor je kinderen",
        bookForFamily: "Boek voor familieleden",
        alwaysTellDuration: "Ik vertel je altijd de duur en eindtijd van de afspraak",
        readyToStart: "Klaar om te Beginnen?",
        youreAllSet: "Je Bent Klaar! 🎉",
        onboardingEnd: "Begin hieronder met me te chatten om afspraken te boeken, vragen te stellen of tandheelkundig advies te krijgen.",
        proTip: "💡 Pro Tip:",
        proTipText: "Vertel me gewoon wat er aan de hand is, dan begeleid ik je door alles!",
        letsStart: "Laten We Beginnen!",
        next: "Volgende",
        back: "Terug",
        previewNotice: "Dit is een werkende preview van First Smile AI klaar voor gebruik in de praktijk.",
        aiDisclaimer: "Deze assistent gebruikt AI. Controleer altijd medisch advies.",
        acceptTerms: "Ik accepteer de Algemene Voorwaarden",
        viewTerms: "Voorwaarden Bekijken",
        termsTitle: "Algemene Voorwaarden",
        termsIntro: "Lees deze voorwaarden zorgvuldig door voordat je First Smile AI gebruikt.",
        termsUse: "Gebruik deze dienst verantwoordelijk en respecteer anderen.",
        termsPrivacy: "We verwerken je gegevens volgens ons privacybeleid.",
        termsMedical: "Raadpleeg altijd een professional voor ernstige medische problemen.",

        // Emergency Triage
        'triage.title': 'Spoed Tandheelkundige Triage',
        'triage.subtitle': 'Beantwoord de volgende vragen om je urgentieniveau te beoordelen',
        'triage.pain.title': 'Pijnbeoordeling',
        'triage.pain.question': 'Op een schaal van 1-10, hoe ernstig is je pijn?',
        'triage.pain.none': 'Geen pijn (1)',
        'triage.pain.severe': 'Ernstige pijn (10)',
        'triage.symptoms.title': 'Extra Symptomen',
        'triage.symptoms.bleeding': 'Bloeding van tandvlees of tanden',
        'triage.symptoms.swelling': 'Zwelling van gezicht of tandvlees',
        'triage.symptoms.fever': 'Koorts (>38°C)',
        'triage.symptoms.difficulty': 'Moeite met slikken of ademen',
        'triage.symptoms.trauma': 'Recent tandheelkundig trauma of letsel',
        'triage.duration.title': 'Duur van Symptomen',
        'triage.duration.question': 'Hoe lang heb je deze symptomen al?',
        'triage.duration.hours': 'Minder dan 6 uur',
        'triage.duration.day': '6-24 uur',
        'triage.duration.days': '2-7 dagen',
        'triage.duration.week': 'Meer dan een week',
        'triage.medical.title': 'Medische Geschiedenis',
        'triage.medical.diabetes': 'Diabetes',
        'triage.medical.heart': 'Hartaandoening',
        'triage.medical.blood': 'Bloedaandoeningen',
        'triage.medical.immune': 'Verzwakt immuunsysteem',
        'triage.submit': 'Urgentie Beoordelen & Afspraak Boeken',
        'triage.result.emergency': 'NOODGEVAL - Onmiddellijke aandacht vereist',
        'triage.result.high': 'HOGE URGENTIE - Afspraak dezelfde dag nodig',
        'triage.result.medium': 'GEMIDDELDE URGENTIE - Afspraak binnen 2-3 dagen',
        'triage.result.low': 'LAGE URGENTIE - Reguliere afspraak nodig',

        // Booking Triage
        'booking.title': 'Boek Je Afspraak',
        'booking.earliest': 'Eerst Beschikbare Tijdslots',
        'booking.confirm': 'Afspraak Bevestigen',
        'booking.success': 'Afspraak succesvol geboekt!',
        'booking.detailsTitle': 'Afspraakdetails',
        'booking.dentist': 'Tandarts',
        'booking.date': 'Datum',
        'booking.time': 'Tijd',
        'booking.urgency': 'Urgentie',
        'booking.urgentArrivalNotice': 'Vanwege de urgente aard van je zaak, kom alsjeblieft 15 minuten eerder. Als je toestand verslechtert, neem dan onmiddellijk contact op met de hulpdiensten.',
        'booking.continue': 'Doorgaan naar Dashboard',
        'booking.selectDate': 'Selecteer Datum',
        'booking.availableTimes': 'Beschikbare Tijden',
        'booking.noSlots': 'Geen beschikbare tijdslots voor deze datum',
        'booking.selectDatePrompt': 'Selecteer een datum om beschikbare tijden te bekijken',
        'booking.selectedDentist': 'Geselecteerde tandarts',
        'booking.selectedBadge': 'Geselecteerd',

        // Emergency Triage Entry
        'entry.heroTitle': 'Spoed Triage Beoordeling',
        'entry.heroDesc': 'Snelle, veilige en nauwkeurige tandheelkundige spoedbeoordeling',
        'entry.ctaStart': 'Start Spoedbeoordeling',
        'entry.steps.assessSymptoms.title': 'Symptomen Beoordelen',
        'entry.steps.assessSymptoms.desc': 'Beantwoord vragen over je pijn en symptomen',
        'entry.steps.getUrgency.title': 'Urgentieniveau Krijgen',
        'entry.steps.getUrgency.desc': 'Ontvang je urgentiewaardering (schaal 1-5)',
        'entry.steps.viewSlots.title': 'Beschikbare Tijdslots Bekijken',
        'entry.steps.viewSlots.desc': 'Bekijk geprioriteerde afspraaktijden',
        'entry.steps.bookInstantly.title': 'Direct Boeken',
        'entry.steps.bookInstantly.desc': 'Bevestig je afspraak onmiddellijk',
        'entry.emergencyNotice.title': 'Levensbedreigende Noodsituatie?',
        'entry.emergencyNotice.desc': "Als je ernstige ademhalingsproblemen, ongecontroleerde bloedingen of tekenen van ernstige infectie ervaart, bel dan onmiddellijk de hulpdiensten (112).",
        'entry.gdpr.title': 'Privacy & Veiligheid',
        'entry.gdpr.desc': 'Je gezondheidsinformatie is beschermd onder de AVG. Gegevens zijn versleuteld en worden alleen gedeeld met je geselecteerde tandarts voor afspraakdoeleinden.',
        'entry.return': 'Terug naar Hoofdapp',
        'entry.stats.minutes': '2-3 Minuten',
        'entry.stats.quick': 'Snelle Beoordeling',
        'entry.stats.gdpr': 'AVG Conform',
        'entry.stats.secure': 'Veilig & Privé',
        'entry.stats.directBooking': 'Direct Boeken',
        'entry.stats.noChat': 'Geen Chat Nodig',

        // Appointment Details Dialog
        appointmentDetailsTitle: "Afspraakdetails",
        appointmentInformation: "Afspraakinformatie",
        urgency: "urgentie",
        reason: "Reden:",
        completed: "Voltooid:",
        notes: "Notities",
        consultationNotes: "Consultnotities",
        additionalNotes: "Aanvullende Notities",
        medicalRecords: "Medische Dossiers",
        prescriptions: "Recepten",
        billingInformation: "Factuurinformatie",
        findings: "Bevindingen:",
        recommendations: "Aanbevelingen:",
        prescribed: "Voorgeschreven:",
        invoice: "Factuur",
        download: "Downloaden",
        patientAmount: "Patiëntbedrag:",
        vat: "BTW:",
        total: "Totaal:",
        created: "Aangemaakt:",
        failedToLoadDetails: "Laden van afspraakdetails mislukt",

        // Patient Dashboard Components
        goodMorning: "Goedemorgen",
        goodAfternoon: "Goedemiddag",
        goodEvening: "Goedenavond",
        hereIsYourHealthOverview: "Hier is je gezondheidsoverzicht",
        confirmed: "Bevestigd",
        join: "Deelnemen",
        activeMedications: "Actieve medicatie",
        viewInCareTab: "Bekijk in Zorg-tabblad",
        balance: "Saldo",
        due: "Verschuldigd",
        amountDue: "Verschuldigd bedrag",
        allPaid: "Alles betaald",
        payNow: "Nu Betalen",
        aiAssistant: "AI Assistent",
        getInstantHelpWith: "Krijg direct hulp met:",
        bookingAppointments: "Afspraken boeken",
        dentalQuestions: "Tandheelkundige vragen",
        emergencyTriage: "Spoedtriage",
        startChat: "Start Chat",
        dailyTipsReminders: "Dagelijkse Tips & Herinneringen",
        morningReminder: "Ochtendherinnering",
        dontForgetToBrush: "Vergeet niet 2 minuten te poetsen",
        healthTip: "Gezondheidstip",
        flossingDaily: "Dagelijks flossen vermindert tandvleesziekten met 40%",
        upcoming: "Aankomend",
        past: "Afgelopen",
        book: "Boeken",
        dentalCleaningRecommended: "Tandreiniging aanbevolen over 2 maanden",
        healthRecords: "Gezondheidsdossiers",
        rewards: "Beloningen",
        quicklyBookViewRecords: "Snel boeken, dossiers bekijken en betalingen beheren.",
        yourTreatmentsWillAppear: "Je behandelingen en bezoeken verschijnen hier.",
        unpaid: "Onbetaald",
        paid: "Betaald",
        statements: "Overzichten",
        paidInvoices: "Je betaalde facturen verschijnen hier.",
        downloadStatements: "Maandelijkse overzichten downloaden.",
        viewManageMedications: "Bekijk en beheer je medicatie.",
        upload: "Uploaden",
        shareLink: "Link delen",
        insuranceProvider: "Aanbieder",
        insuranceProviderPlaceholder: "Zorgverzekering / Naam verzekeraar",
        policyNumber: "Polis / Lidnummer",
        policyNumberPlaceholder: "Polisnummer",
        healthStats: "Gezondheidsstatistieken",
        healthRating: "Gezondheidsbeoordeling",
        excellent: "Uitstekend",
        visitsThisYear: "Bezoeken Dit Jaar",
        onTrack: "Op schema",
        coverageUsed: "Dekking Gebruikt",
        remaining: "resterend",
        healthImproved: "Gezondheid Verbeterd",
        lastSixMonths: "Laatste 6 maanden",
        treatmentPlans: "Behandelplannen",
        manageDentalVisits: "Beheer je tandartsbezoeken",
        bookNew: "Nieuw Boeken",
        active: "Actief",
        mainClinic: "Hoofdkliniek",
        generalCheckup: "Algemene Controle",
        today: "Vandaag",
        calendar: "Kalender",
        list: "Lijst",
        history: "Geschiedenis",
        cancelled: "Geannuleerd",
        scheduled: "Gepland",

        // Dentist Dashboard
        loadingDentistDashboard: "Tandartsdashboard laden...",
        notRegisteredAsDentist: "Je bent niet geregistreerd als tandarts. Neem contact op met support.",
        dentiDashboard: "Tandarts Dashboard",
        dentistPortal: "Tandartsportaal",
        loadingDentistProfile: "Tandartsprofiel laden...",

        // AppShell & Navigation
        navClinical: "Klinisch",
        navBusiness: "Zakelijk",
        navOperations: "Operaties",
        navAdmin: "Admin",
        navDashboard: "Dashboard",
        navAppointments: "Afspraken",
        navPatients: "Patiënten",
        navPayments: "Betalingen",
        navAnalytics: "Analyse",
        navReports: "Rapporten",
        navInventory: "Inventaris",
        navImport: "Import",
        navSchedule: "Planning",
        navSettings: "Instellingen",
        navBrandingLoc: "Branding & Lokalisatie",
        navSecurity: "Privacy & Beveiliging",
        topSearch: "Zoeken",
        topClinic: "Kliniek",
        topProfile: "Profiel",

        // Patient portal navigation (pnav.*)
        pnav: {
            group: {
                care: "Zorg",
                billing: "Facturatie",
                documents: "Documenten",
                account: "Account",
            },
            care: {
                home: "Home",
                appointments: "Afspraken",
                prescriptions: "Recepten",
                history: "Behandelgeschiedenis",
            },
            billing: { main: "Facturen & Betalingen" },
            docs: { main: "Mijn Documenten" },
            account: {
                profile: "Profiel & Instellingen",
                insurance: "Verzekering / Mutualiteit",
                privacy: "Privacy & Beveiliging",
                help: "Hulp & Ondersteuning",
            },
        },

        // Treatment records
        searchTreatments: "Behandelingen zoeken...",
        filterByType: "Filteren op type",
        allTypes: "Alle types",
        consultation: "Consult",
        treatment: "Behandeling",
        xray: "Röntgenfoto",
        labResult: "Labresultaat",
        dentist: "Tandarts",
        treatmentType: "Behandelingstype",
        date: "Datum",
        noRecordsFound: "Geen behandeldossiers gevonden",
        appointmentRescheduled: "Afspraak verzet",
        savedSuccessfully: "Succesvol opgeslagen",

        // Dashboard & Portal
        todaysSchedule: "Planning Vandaag",
        completedThisWeek: "Voltooid Deze Week",
        noAppointmentsToday: "Geen afspraken vandaag",
        noAppointmentsTodayDesc: "Je hebt geen afspraken gepland voor vandaag. Gebruik deze tijd om andere taken in te halen of nieuwe afspraken te plannen.",
        viewAllAppointments: "Alle Afspraken Bekijken",
        scheduleNew: "Nieuw Plannen",
        unknownPatient: "Onbekende Patiënt",
        urgent: "Urgent",
        noReasonSpecified: "Geen reden opgegeven",

        // Messages Page
        signInToMessage: "Log in om te Berichten",
        needSignedInToMessage: "Je moet ingelogd zijn om berichten te versturen en ontvangen",
        selectConversation: "Selecteer een gesprek",

        // Patient Management
        selectPatient: "Selecteer Patiënt",
        findPatient: "Patiënt zoeken...",
        addNewPatient: "Nieuwe Patiënt Toevoegen",
        overview: "Overzicht",
        clinical: "Klinisch",
        schedule: "Planning",
        financial: "Financieel",
        years: "jaar",
        yearsOld: "jaar oud",
        medicalAlert: "Medische Waarschuwing",
        unpaidBalance: "Openstaand Saldo",
        quickActions: "Snelle Acties",
        createPayment: "Betaling Aanmaken",
        addTreatmentPlan: "Behandelplan Toevoegen",
        addQuickNote: "Snelle Notitie Toevoegen",
        exportPdf: "PDF Exporteren",
        searchNotesAppointmentsTreatments: "Zoek notities, afspraken, behandelingen...",
        patientTimeline: "Patiënttijdlijn",
        noPatientsYet: "Nog geen patiënten",
        appointmentCompleted: "Afspraak voltooid",
        appointmentCancelledToast: "Afspraak geannuleerd",
        patientNotifiedByEmail: "Patiënt is per e-mail geïnformeerd",
        appointmentConfirmedToast: "Afspraak bevestigd",
        noteAdded: "Notitie toegevoegd",
        treatmentPlanCreated: "Behandelplan aangemaakt",
        treatmentPlanDeleted: "Behandelplan verwijderd",
        clickUndoToRestore: "Klik ongedaan maken om te herstellen",
        appointmentDeleted: "Afspraak verwijderd",
        noteDeleted: "Notitie verwijderd",
        treatmentPlanRestored: "Behandelplan hersteld",
        appointmentRestored: "Afspraak hersteld",
        noteRestored: "Notitie hersteld",
        appointmentLinked: "Afspraak gekoppeld",
        linkedTo: "Gekoppeld aan",
        noEmail: "Geen e-mail",
        patientHasNoEmail: "Patiënt heeft geen e-mailadres",
        patientUpdated: "Patiënt bijgewerkt",
        enterTitle: "Voer een titel in",
        failedToCreateTreatmentPlan: "Behandelplan aanmaken mislukt",
        failedToUpdatePatient: "Patiënt bijwerken mislukt",
        failedToDeleteTreatmentPlan: "Behandelplan verwijderen mislukt",
        failedToDeleteAppointment: "Afspraak verwijderen mislukt",
        failedToDeleteNote: "Notitie verwijderen mislukt",
        failedToRestoreTreatmentPlan: "Behandelplan herstellen mislukt",
        failedToRestoreAppointment: "Afspraak herstellen mislukt",
        failedToRestoreNote: "Notitie herstellen mislukt",
        failedToLinkAppointment: "Afspraak koppelen mislukt",
        failedToAddNote: "Notitie toevoegen mislukt",
        deleteTreatmentPlan: "Behandelplan Verwijderen",
        deleteAppointment: "Afspraak Verwijderen",
        confirmDeleteTreatmentPlan: "Weet je zeker dat je dit behandelplan wilt verwijderen?",
        confirmDeleteAppointment: "Weet je zeker dat je deze afspraak permanent wilt verwijderen?",
        confirmDeleteSelected: "Weet je zeker dat je de geselecteerde items wilt verwijderen?",
        itemsDeleted: "items verwijderd",
        undo: "Ongedaan Maken",

        // Dentist: Clinical appointment UI
        completeAppointment: "Afspraak Voltooien",
        prescriptionsShort: "Recepten",
        paymentsShort: "Betalingen",
        viewAll: "Alles bekijken",
        collapse: "Inklappen",
        expand: "Uitklappen",
        srAlertNew: "Nieuwe kritieke waarschuwing",
        srQuickActions: "Snelle acties werkbalk",

        // All Status labels
        allStatus: "Alle Statussen",
        pending: "In behandeling",
        time: "Tijd",
        patient: "Patiënt",
        status: "Status",
        actions: "Acties",
        view: "Bekijken",
        notRegisteredDentist: "Je bent niet geregistreerd als tandarts. Neem contact op met support.",
        contactSupport: "Contact Support",
        todaysAppointments: "Afspraken Vandaag",
        urgentCases: "Urgente Gevallen",
        completionRate: "Voltooiingspercentage",
        highPriority: "Hoge prioriteit afspraken",
        estimatedRevenue: "Geschatte Omzet",
        avg: "Gem",
        statusOverview: "Statusoverzicht",
        generalConsultationLower: "Algemeen consult",

        // Payment page translations
        paymentCancelled: "Betaling Geannuleerd",
        paymentCancelledMessage: "Je betaling is geannuleerd. Je kunt het opnieuw proberen of contact opnemen met je tandarts als je hulp nodig hebt.",
        closeWindow: "Venster Sluiten",

        // Common
        'common.cancel': "Annuleren",
        'common.next': "Volgende",
        'common.back': "Terug",
        'common.loading': "Bezig met laden...",
        'common.success': "Gelukt",
    },
};

const isTranslationObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const mergeTranslations = (
    base: Record<string, any>,
    override: TranslationEntry,
): Translations => {
    const result = { ...base } as Record<string, any>;

    Object.entries(override || {}).forEach(([key, value]) => {
        if (value === undefined) return;

        if (isTranslationObject(value) && isTranslationObject(base[key])) {
            result[key] = mergeTranslations(base[key], value as TranslationEntry);
        } else {
            result[key] = value;
        }
    });

    return result as Translations;
};

export const getTranslationsForLanguage = (language: Language): Translations => {
    const base = translations.en as Translations;
    const override = translations[language] || {};
    return mergeTranslations(base, override);
};

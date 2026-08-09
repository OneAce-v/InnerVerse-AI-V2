import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "hi" | "de";

export const translations = {
  en: {
    // Nav Items
    "nav.dashboard": "Dashboard",
    "nav.twin": "Digital Twin",
    "nav.tracking": "Smart Track",
    "nav.analytics": "Analytics",
    "nav.community": "Community",
    "nav.coach": "Coach Nova",
    "nav.journal": "Journal",
    "nav.settings": "Settings",
    "nav.signout": "Sign Out",

    // Layout/General
    "common.streak": "Streak",
    "common.coins": "Coins",
    "common.level": "Level",
    "common.loading": "Loading...",
    "common.xp": "XP",

    // Settings
    "settings.title": "Language Settings",
    "settings.subtitle": "Customize your preferred application dialect",
    "settings.selectLanguage": "Select Language",
    "settings.gamification": "Gamification Settings",
    "settings.wearables": "Wearables",
    "settings.appearance": "Visual Theme",
    "settings.account": "Sovereign Account Profile",

    // Twin
    "twin.title": "InnerVerse Digital Twin",
    "twin.subtitle": "Biological health model synced with metrics.",
    "twin.recovery": "Recovery Efficiency",
    "twin.matching": "Twin Matching Accuracy",
    "twin.activeStreak": "Active Habits Streak",
    "twin.timeline": "Wellness Timeline",
    "twin.badges": "Badges & Portfolio",
    "twin.sensors": "Linked Sensors",
    "twin.logEvent": "Log Custom Health Event",
    "twin.logPlaceholder": "E.g. done 20 mins of yoga...",
    "twin.badgeSubtitle": "Accomplishments auto-unlocked based on your telemetry.",

    // Dashboard
    "dash.title": "Your InnerVerse",
    "dash.subtitle": "Holistic biological model calibration dashboard.",
    "dash.score": "Biological Harmony Index",
    "dash.scoreSub": "Explainable AI Biometric Calibration",
    "dash.activeQuests": "Active Daily Quests",
    "dash.claims": "Claim Reward",
    "dash.questUnlocked": "Completed!",
    
    // Tracking
    "track.title": "Sensing Tracking Core",
    "track.subtitle": "Log meals, scans, workouts, and sleep to fuel your twin.",
    "track.mealScanner": "AI Plate lens Computer Vision",
    "track.presetScan": "Select Preset Sample Food Plate",
    "track.sleepHeader": "Sleep Telemetry Calibration",
    "track.workoutHeader": "Workout Active Telemetry",
    "track.habitsTitle": "Daily Habits Calibration",
    "track.habitsSubtitle": "Check off your daily health habits to train your digital bio-twin.",
    "track.addHabit": "Add Custom Habit",
    "track.habitPlaceholder": "Enter a new daily goal...",
    "track.completed": "Completed",

    // Analytics
    "analytics.title": "Analytics Diagnostics",
    "analytics.subtitle": "Decisions backed by Explainable intelligence analysis rules.",

    // Chat / Coach
    "chat.title": "Coach Nova - GenAI AI Advisor",
    "chat.subtitle": "Explainable Yoga, active training, and nutrition feedback.",
    
    // Onboarding
    "onboarding.welcome": "Calibrate Your Bio-Twin Profile",
    "onboarding.step": "Step",
  },
  hi: {
    // Nav Items
    "nav.dashboard": "डैशबोर्ड",
    "nav.twin": "डिजिटल ट्विन",
    "nav.tracking": "स्मार्ट ट्रैक",
    "nav.analytics": "विश्लेषण",
    "nav.community": "समुदाय",
    "nav.coach": "कोच नोवा",
    "nav.journal": "जर्नल",
    "nav.settings": "सेटिंग्स",
    "nav.signout": "साइन आउट",

    // Layout/General
    "common.streak": "लगातार दिन",
    "common.coins": "सिक्के",
    "common.level": "स्तर",
    "common.loading": "लोड हो रहा है...",
    "common.xp": "एक्सपी",

    // Settings
    "settings.title": "भाषा सेटिंग्स",
    "settings.subtitle": "अपने पसंदीदा ऐप बोली अनुकूलित करें",
    "settings.selectLanguage": "भाषा चुनें",
    "settings.gamification": "गेमीफिकेशन सेटिंग्स",
    "settings.wearables": "वियरेबल्स",
    "settings.appearance": "थीम डिजाइन",
    "settings.account": "संप्रभु खाता प्रोफाइल",

    // Twin
    "twin.title": "इनरवर्श डिजिटल ट्विन",
    "twin.subtitle": "बायोलॉजिकल स्वास्थ्य मॉडल जो बायोमेट्रिक डेटा से सिंक रहता है।",
    "twin.recovery": "रिकवरी दक्षता",
    "twin.matching": "ट्विन मिलान शुद्धता",
    "twin.activeStreak": "तंदुरुस्ती की लगातार अवधि",
    "twin.timeline": "कल्याण समयरेखा",
    "twin.badges": "बैज और पोर्टफोलियो",
    "twin.sensors": "जुड़े हुए सेंसर",
    "twin.logEvent": "कस्टम कल्याण स्थिति दर्ज करें",
    "twin.logPlaceholder": "मसलन, मैंने धूप में 20 मिनट योगाभ्यास किया...",
    "twin.badgeSubtitle": "आपके डिजिटल ट्विन डेटा के आधार पर अपने आप अनलॉक होने वाली उपलब्धियां।",

    // Dashboard
    "dash.title": "आपका इनरवर्श",
    "dash.subtitle": "समग्र जैविक मॉडल अंशांकन डैशबोर्ड।",
    "dash.score": "जैविक सद्भाव सूचकांक",
    "dash.scoreSub": "एक्सप्लेनेबल एआई बायोमेट्रिक अंशांकन",
    "dash.activeQuests": "सक्रिय दैनिक खोज",
    "dash.claims": "दावा पुरस्कार",
    "dash.questUnlocked": "पूरा हुआ!",

    // Tracking
    "track.title": "ट्रैकिंग कोर सेंसिंग",
    "track.subtitle": "अपने ट्विन को ऊर्जा देने के लिए भोजन, स्कैन, कसरत और नींद दर्ज करें।",
    "track.mealScanner": "एआई प्लेट लेंस कंप्यूटर विजन",
    "track.presetScan": "नमूना भोजन प्लेट चुनें",
    "track.sleepHeader": "नींद टेलीमेट्री अंशांकन",
    "track.workoutHeader": "कसरत सक्रिय टेलीमेट्री",
    "track.habitsTitle": "दैनिक आदतों का अंशांकन",
    "track.habitsSubtitle": "अपने डिजिटल बायो-ट्विन को प्रशिक्षित करने के लिए अपनी दैनिक स्वास्थ्य आदतों की जांच करें।",
    "track.addHabit": "कस्टम आदत जोड़ें",
    "track.habitPlaceholder": "एक नया दैनिक लक्ष्य दर्ज करें...",
    "track.completed": "पूरा हुआ",

    // Analytics
    "analytics.title": "विश्लेषण डायग्नोस्टिक्स",
    "analytics.subtitle": "व्याख्यात्मक एआई सिद्धांतों द्वारा समर्थित निर्णय।",

    // Chat / Coach
    "chat.title": "कोच नोवा - जेन-एआई सलाहकार",
    "chat.subtitle": "स्पष्टीकरण योग्य योग, सक्रिय कसरत और पोषण प्रतिक्रिया।",

    // Onboarding
    "onboarding.welcome": "अपना खुद का बायो-ट्विन कैलिब्रेट करें",
    "onboarding.step": "कदम",
  },
  de: {
    // Nav Items
    "nav.dashboard": "Dashboard",
    "nav.twin": "Digital Zwilling",
    "nav.tracking": "Smart Track",
    "nav.analytics": "Analytik",
    "nav.community": "Community",
    "nav.coach": "Coach Nova",
    "nav.journal": "Tagebuch",
    "nav.settings": "Einstellungen",
    "nav.signout": "Abmelden",

    // Layout/General
    "common.streak": "Serie",
    "common.coins": "Münzen",
    "common.level": "Stufe",
    "common.loading": "Ladevorgang...",
    "common.xp": "XP",

    // Settings
    "settings.title": "Spracheinstellungen",
    "settings.subtitle": "Passen Sie die bevorzugte Anwendungssprache an",
    "settings.selectLanguage": "Sprache auswählen",
    "settings.gamification": "Gamification-Einstellungen",
    "settings.wearables": "Wearables",
    "settings.appearance": "Visuelles Thema",
    "settings.account": "Souveränes Kontoprofil",

    // Twin
    "twin.title": "InnerVerse Digitaler Zwilling",
    "twin.subtitle": "Biologisches Gesundheitsmodell, synchronisiert mit Telemetrie.",
    "twin.recovery": "Erholungseffizienz",
    "twin.matching": "Zwilling-Übereinstimmungsgenauigkeit",
    "twin.activeStreak": "Aktive habituelle Serie",
    "twin.timeline": "Tagebuch-Chronik",
    "twin.badges": "Abzeichen & Portfolio",
    "twin.sensors": "Gekoppelte Sensoren",
    "twin.logEvent": "Eigenen Gesundheits-Event loggen",
    "twin.logPlaceholder": "Z.B. 20 Min. Outdoor-Yoga in der Sonne...",
    "twin.badgeSubtitle": "Leistungen, die basierend auf Ihren Zwillingsdaten freigeschaltet werden.",

    // Dashboard
    "dash.title": "Ihr InnerVerse",
    "dash.subtitle": "Dashboard zur ganzheitlichen biologischen Modellkalibrierung.",
    "dash.score": "Biologischer Harmonie-Index",
    "dash.scoreSub": "Erklärbare KI Biometrische Kalibrierung",
    "dash.activeQuests": "Aktive Tägliche Quests",
    "dash.claims": "Belohnung einfordern",
    "dash.questUnlocked": "Abgeschlossen!",

    // Tracking
    "track.title": "Erfassungskern (Smart Track)",
    "track.subtitle": "Protokollieren Sie Mahlzeiten, Scans, Workouts und Schlaf.",
    "track.mealScanner": "KI-Teller-Linsen Computer-Vision",
    "track.presetScan": "Beispiel-Teller auswählen",
    "track.sleepHeader": "Schlaf-Telemetrie-Kalibrierung",
    "track.workoutHeader": "Klima- oder Trainings-Telemetrie",
    "track.habitsTitle": "Tägliche Gewohnheits-Kalibrierung",
    "track.habitsSubtitle": "Haken Sie Ihre täglichen Gesundheitsgewohnheiten ab, um Ihren digitalen Bio-Zwilling zu trainieren.",
    "track.addHabit": "Eigene Gewohnheit hinzufügen",
    "track.habitPlaceholder": "Neues tägliches Ziel eingeben...",
    "track.completed": "Abgeschlossen",

    // Analytics
    "analytics.title": "Analytische Diagnostik",
    "analytics.subtitle": "Entscheidungen gestützt auf erklärbare KI-Regeln.",

    // Chat / Coach
    "chat.title": "Coach Nova - KI Berater",
    "chat.subtitle": "Erklärbares Yoga, aktives Training und Ernährungsfeedback.",

    // Onboarding
    "onboarding.welcome": "Kalibrieren Sie Ihren Bio-Zwilling",
    "onboarding.step": "Schritt",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof (typeof translations)["en"], defaultText: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("innerverse_language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("innerverse_language", lang);
  };

  const t = (key: keyof (typeof translations)["en"], defaultText: string): string => {
    const dict = translations[language];
    return (dict as any)[key] || (translations["en"] as any)[key] || defaultText;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

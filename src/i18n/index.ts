import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// English
import enCommon from "./locales/en/common.json";

// Hindi
import hiCommon from "./locales/hi/common.json";

// Marathi
import mrCommon from "./locales/mr/common.json";

const resources = {
  en: {
    common: enCommon,
  },
  hi: {
    common: hiCommon,
  },
  mr: {
    common: mrCommon,
  },
};

i18n.use(initReactI18next).init({
  resources,

  lng: "hi",
  fallbackLng: {
    mr: ["hi", "en"],
    hi: ["en"],
    en: ["hi"],
    default: ["en"],
  },

  ns: ["common"],
  defaultNS: "common",

  interpolation: {
    escapeValue: false,
  },

  returnNull: false,
  returnEmptyString: false,
});

export default i18n;
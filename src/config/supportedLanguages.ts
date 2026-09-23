export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

export const supportedLanguages: SupportedLanguage[] = [
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    direction: "ltr",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    direction: "ltr",
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
  },
];
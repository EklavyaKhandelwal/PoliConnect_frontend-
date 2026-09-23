import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "./redux";
import {
  setLanguage,
  type Language,
} from "../store/slices/languageSlice";

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const dispatch = useAppDispatch();

  const language = useAppSelector(
    (state) => state.language.currentLanguage
  );

  const changeLanguage = (newLanguage: Language) => {
    dispatch(setLanguage(newLanguage));
    i18n.changeLanguage(newLanguage);
  };

  return {
    language,
    changeLanguage,
  };
};
import { FiHeart, FiHelpCircle, FiZap } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export type SuggestionType = "suggestion" | "thanks" | "question";

interface SuggestionTypeSelectorProps {
  selected: SuggestionType;
  onChange: (type: SuggestionType) => void;
}

const suggestionTypes: { key: SuggestionType; icon: typeof FiZap }[] = [
  { key: "suggestion", icon: FiZap },
  { key: "thanks", icon: FiHeart },
  { key: "question", icon: FiHelpCircle },
];

const SuggestionTypeSelector = ({ selected, onChange }: SuggestionTypeSelectorProps) => {
  const { t } = useTranslation("common");

  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-3 text-sm font-bold text-slate-500">
        {t("suggestionThanks.typePrompt")}
      </legend>
      {suggestionTypes.map(({ key, icon: Icon }) => {
        const isSelected = selected === key;
        return (
          <button
            type="button"
            key={key}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(key)}
            className={`flex min-h-[60px] w-full items-center gap-4 rounded-2xl border-2 px-4 text-left font-bold transition ${
              isSelected
                ? "border-blue-500 bg-blue-100/80 text-blue-600"
                : "border-transparent bg-white text-slate-800 shadow-[0_4px_12px_rgba(44,79,125,0.08)]"
            }`}
          >
            <Icon size={22} className="shrink-0" />
            <span className="flex-1">{t(`suggestionThanks.types.${key}`)}</span>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                isSelected ? "border-blue-500" : "border-slate-300"
              }`}
            >
              {isSelected && <span className="h-4 w-4 rounded-full bg-blue-500" />}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
};

export default SuggestionTypeSelector;

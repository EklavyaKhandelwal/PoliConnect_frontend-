import {
  FiBookOpen,
  FiCheck,
  FiCreditCard,
  FiDroplet,
  FiHeart,
  FiMoreHorizontal,
  FiNavigation,
  FiWind,
  FiZap,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { complaintCategories, type ComplaintCategory } from "./problemPhotoTypes";

const categoryIcons = {
  road: FiNavigation,
  water: FiDroplet,
  electricity: FiZap,
  cleanliness: FiWind,
  health: FiHeart,
  ration: FiCreditCard,
  education: FiBookOpen,
  other: FiMoreHorizontal,
};

const CategoryStep = ({ onSelect }: { onSelect: (category: ComplaintCategory) => void }) => {
  const { t } = useTranslation("common");

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-800 sm:text-base">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-white">
          <FiCheck size={17} />
        </span>
        {t("problemPhoto.stepTitle")}
      </div>

      <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:py-4">
        <p className="text-sm leading-6 text-slate-700 sm:text-base">{t("problemPhoto.intro")}</p>
      </div>
      <div className="mt-2 rounded-2xl bg-white px-4 py-3 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:py-4">
        <p className="text-sm text-slate-700 sm:text-base">{t("problemPhoto.question")}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        {complaintCategories.map((category) => {
          const Icon = categoryIcons[category];
          return (
            <button
              type="button"
              key={category}
              onClick={() => onSelect(category)}
              className="flex min-h-16 items-center gap-2.5 rounded-2xl bg-white px-3 text-left shadow-[0_5px_16px_rgba(44,79,125,0.10)] transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] sm:min-h-20 sm:px-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 sm:h-11 sm:w-11">
                <Icon size={20} strokeWidth={2.5} />
              </span>
              <span className="text-sm font-bold sm:text-base">
                {t(`problemPhoto.categories.${category}`)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500 sm:text-sm">{t("problemPhoto.footerHint")}</p>
    </>
  );
};

export default CategoryStep;

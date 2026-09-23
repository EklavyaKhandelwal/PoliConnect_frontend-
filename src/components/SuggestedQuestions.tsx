import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../hooks/redux";
import { clearChat } from "../store/slices/chatSlice";
import { FiChevronRight } from "react-icons/fi";

const SuggestedQuestions = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const questions = [
    {
      id: "smartCity",
      title: t("suggestions.smartCity.title"),
      description: t("suggestions.smartCity.description"),
    },
    {
      id: "water",
      title: t("suggestions.water.title"),
      description: t("suggestions.water.description"),
    },
    {
      id: "corridor",
      title: t("suggestions.corridor.title"),
      description: t("suggestions.corridor.description"),
    },
    {
      id: "health",
      title: t("suggestions.health.title"),
      description: t("suggestions.health.description"),
    },
    {
      id: "education",
      title: t("suggestions.education.title"),
      description: t("suggestions.education.description"),
    },
    {
      id: "documents",
      title: t("suggestions.documents.title"),
      description: t("suggestions.documents.description"),
    },
  ];

  const scrollNext = () => {
    document.getElementById("suggested-questions-list")?.scrollBy({ left: 220, behavior: "smooth" });
  };

  return (
    <section className="mt-8 w-full sm:mt-10">
      <div className="mx-auto w-full max-w-[620px]">
        <div className="mb-3 flex items-center justify-between sm:mb-5">
          <h2 className="text-sm font-semibold text-blue-600 sm:text-lg">
            {t("home.suggestedQuestions")}
          </h2>

          <button
            type="button"
            onClick={scrollNext}
            className="shrink-0 text-sm font-medium text-blue-600 sm:text-base"
          >
            <span className="flex items-center gap-1">{t("home.showMore")} <FiChevronRight /></span>
          </button>
        </div>

        <div className="w-full overflow-hidden">
          <div id="suggested-questions-list" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
            {questions.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => {
                  dispatch(clearChat());
                  navigate("/chat", {
                    state: { initialMessage: `${question.title}: ${question.description}` },
                  });
                }}
                className="w-[145px] min-w-[145px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:shadow-md sm:w-[175px] sm:min-w-[175px] sm:rounded-2xl sm:px-4 sm:py-3"
              >
                <p className="truncate text-sm font-semibold text-slate-800">
                  {question.title}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {question.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SuggestedQuestions;
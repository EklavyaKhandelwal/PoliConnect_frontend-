import { useTranslation } from "react-i18next";
import leaderImage from "../assets/images/leader.png";

const Hero = () => {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center text-center">
      {/* Character */}
      <div className="mt-20 flex justify-center sm:mt-16 lg:mt-14">
        <img
          src={leaderImage}
          alt=""
          className="w-[285px] object-contain sm:w-[260px] lg:w-[280px]"
        />
      </div>

      {/* Greeting */}
      <h1 className="mt-6 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
        {t("home.greeting")}
      </h1>

      {/* Description */}
      <p className="mt-4 max-w-[350px] text-base leading-7 text-slate-500 sm:max-w-[650px] sm:text-lg">
        {t("home.description")}
      </p>
    </section>
  );
};

export default Hero;
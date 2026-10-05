import { useTranslation } from "react-i18next";
import leaderImage from "../assets/images/leader.png";

const Hero = () => {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center text-center">
      {/* Character */}
      <div className="mt-7 flex justify-center sm:mt-16 lg:mt-14">
        <img
          src={leaderImage}
          alt=""
          className="w-[min(220px,64vw)] object-contain sm:w-[260px] lg:w-[280px]"
        />
      </div>

      {/* Greeting */}
      <h1 className="mt-4 text-2xl font-bold leading-tight text-slate-900 sm:mt-6 sm:text-4xl">
        {t("home.greeting")}
      </h1>

      {/* Description */}
      <p className="mt-3 max-w-[350px] text-sm leading-6 text-slate-500 sm:mt-4 sm:max-w-[650px] sm:text-lg sm:leading-7">
        {t("home.description")}
      </p>
    </section>
  );
};

export default Hero;
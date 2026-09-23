import Header from "../../components/Header";
import Hero from "../../components/Hero";
import InputActions from "../../components/InputActions";
import SuggestedQuestions from "../../components/SuggestedQuestions";
import VoiceAssistant from "../../components/VoiceAssistant";
import { useState } from "react";

const Home = () => {
  const [voiceOpen, setVoiceOpen] = useState(false);

  if (voiceOpen) {
    return <VoiceAssistant />;
  }

  return (
    <main className="h-dvh overflow-hidden bg-gradient-to-b from-blue-100 via-blue-50 to-white">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col px-5 sm:px-10 lg:px-16">
        <Header />

        <div className="flex min-h-0 flex-1 flex-col">
          <Hero />

          <SuggestedQuestions />

          <div className="mt-auto">
            <InputActions onMicClick={() => setVoiceOpen(true)} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
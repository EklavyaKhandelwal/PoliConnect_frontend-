import Header from "../../components/Header";
import Hero from "../../components/Hero";
import InputActions from "../../components/InputActions";
import HomeModeSelector from "../../components/HomeModeSelector";
import SuggestedQuestions from "../../components/SuggestedQuestions";
import VoiceAssistant from "../../components/VoiceAssistant";
import { useState } from "react";

const Home = () => {
  const [voiceOpen, setVoiceOpen] = useState(false);

  if (voiceOpen) {
    return <VoiceAssistant />;
  }

  return (
    <main className="min-h-dvh overflow-x-hidden overflow-y-auto bg-gradient-to-b from-blue-100 via-blue-50 to-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 sm:px-8">
        <Header />
        <HomeModeSelector />

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
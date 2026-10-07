import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Home from "../pages/Home/Home";
import Chat from "../pages/Chat/Chat";
import History from "../pages/History/History";
import Settings from "../pages/Settings/Settings";
import Auth from "../pages/Auth/Auth";
import ProblemPhoto from "../pages/ProblemPhoto/ProblemPhoto";
import ComplaintCenter from "../pages/ComplaintCenter/ComplaintCenter";
import SuggestionThanks from "../pages/SuggestionThanks/SuggestionThanks";
import MyUpdates from "../pages/SuggestionThanks/MyUpdates";
import ComplaintTracking from "../pages/ComplaintTracking/ComplaintTracking";
import ComplaintDetail from "../pages/ComplaintTracking/ComplaintDetail";
import VoiceAssistant from "../components/VoiceAssistant";
import { useAppDispatch } from "../hooks/redux";
import { clearAuth, setUser } from "../store/slices/authSlice";
import { clearChat } from "../store/slices/chatSlice";
import { getCurrentUser } from "../services/authService";
import { getAccessToken, setAccessToken } from "../services/api";
import Notifications from "../pages/Notifications/Notifications";
import { CitizenNotificationProvider } from "../components/CitizenNotificationProvider";

const AuthBootstrap = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const bootstrapToken = getAccessToken();
    const handleAuthExpired = () => {
      dispatch(clearAuth());
      dispatch(clearChat());
    };
    window.addEventListener("auth-expired", handleAuthExpired);
    getCurrentUser()
      .then((user) => dispatch(setUser(user)))
      .catch(() => {
        if (getAccessToken() !== bootstrapToken) return;
        setAccessToken(null);
        dispatch(clearAuth());
      });
      return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, [dispatch]);

  return null;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <CitizenNotificationProvider>
      <AuthBootstrap />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Home />} />
        <Route path="/complaint-center" element={<ComplaintCenter />} />
        <Route path="/my-complaints" element={<ComplaintTracking />} />
        <Route path="/my-complaints/:complaintId" element={<ComplaintDetail />} />
        <Route path="/suggestion-thanks" element={<SuggestionThanks />} />
        <Route path="/my-updates" element={<MyUpdates />} />
        <Route path="/problem-photo" element={<ProblemPhoto />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:conversationId" element={<Chat />} />
        <Route path="/voice/:conversationId" element={<VoiceAssistant />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
      </CitizenNotificationProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
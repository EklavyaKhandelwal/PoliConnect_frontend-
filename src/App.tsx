import AppRoutes from "./routes/AppRoutes";
import { useEffect } from "react";
import { useAppSelector } from "./hooks/redux";

function App() {
  const largeText = useAppSelector((state) => state.preferences.largeText);
  useEffect(() => {
    document.documentElement.classList.toggle("text-large", largeText);
  }, [largeText]);
  return <AppRoutes />;
}

export default App;
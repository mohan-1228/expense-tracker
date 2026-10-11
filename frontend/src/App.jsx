import { useEffect, useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token")
  );

  function handleLogin() {
    setIsLoggedIn(true);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  }

  useEffect(() => {
    function handleSessionExpired() {
      setIsLoggedIn(false);
    }

    window.addEventListener("auth:expired", handleSessionExpired);

    return () => {
      window.removeEventListener(
        "auth:expired",
        handleSessionExpired
      );
    };
  }, []);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
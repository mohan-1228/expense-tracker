import { useEffect, useState } from "react";
import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./Dashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token")
  );
  const [screen, setScreen] = useState("login"); // 'login' | 'signup'
  const [notice, setNotice] = useState("");

  function handleLogin() {
    setNotice("");
    setIsLoggedIn(true);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setScreen("login");
  }

  function handleSignedUp() {
    setNotice("Account created, please log in");
    setScreen("login");
  }

  function showLogin() {
    setNotice("");
    setScreen("login");
  }

  function showSignup() {
    setNotice("");
    setScreen("signup");
  }

  useEffect(() => {
    function handleSessionExpired() {
      setIsLoggedIn(false);
    }

    window.addEventListener("auth:expired", handleSessionExpired);

    return () => {
      window.removeEventListener("auth:expired", handleSessionExpired);
    };
  }, []);

  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} />;
  }

  if (screen === "signup") {
    return <Signup onSignedUp={handleSignedUp} onShowLogin={showLogin} />;
  }

  return (
    <Login onLogin={handleLogin} onShowSignup={showSignup} notice={notice} />
  );
}
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./Dashboard";
import Groups from "./Groups";
import GroupDetail from "./GroupDetail";


export default function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token")
  );
  const [notice, setNotice] = useState("");

  function handleLogin() {
    setNotice("");
    setIsLoggedIn(true);
    navigate("/dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    navigate("/login");
  }

  function handleSignedUp() {
    setNotice("Account created, please log in");
    navigate("/login");
  }

  function goToLogin() {
    setNotice("");
    navigate("/login");
  }

  function goToSignup() {
    setNotice("");
    navigate("/signup");
  }

  useEffect(() => {
    function handleSessionExpired() {
      setIsLoggedIn(false);
      navigate("/login");
    }
    window.addEventListener("auth:expired", handleSessionExpired);
    return () =>
      window.removeEventListener("auth:expired", handleSessionExpired);
  }, [navigate]);

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
      />
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={handleLogin} onShowSignup={goToSignup} notice={notice} />
          )
        }
      />
      <Route
        path="/signup"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Signup onSignedUp={handleSignedUp} onShowLogin={goToLogin} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          isLoggedIn ? (
            <Dashboard onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/groups"
        element={
          isLoggedIn ? (
            <Groups />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          isLoggedIn ? (
            <GroupDetail />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
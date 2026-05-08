import { useState } from "react";
import axios from "axios";

const API_BASE = `${import.meta.env.VITE_API_URL ?? "https://eld-backend-one.vercel.app/"}/api/auth`;
const REGISTER_URL = `${API_BASE}/register/register/`;
const LOGIN_URL = `${API_BASE}/login/login/`;

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getServerErrorMessage = (error) => {
  if (!error.response || !error.response.data) {
    return error.message || "Server unavailable";
  }

  const data = error.response.data;
  if (typeof data === "string") {
    return data;
  }
  if (data.detail) {
    return data.detail;
  }

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : value;
      return `${key}: ${message}`;
    })
    .join(" ");
};

const getTokenFromResponse = (data) =>
  data.token || data.access || data.key || "";

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const validatePassword = (value) => value.length >= 8;

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  const loginPayload = (identifier, passwordValue) => {
    if (isEmail(identifier)) {
      return { email: identifier, password: passwordValue };
    }
    return { username: identifier, password: passwordValue };
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter your username/email and password.");
      return null;
    }
    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters.");
      return null;
    }

    try {
      const response = await axios.post(
        LOGIN_URL,
        loginPayload(username, password),
      );
      const token = getTokenFromResponse(response.data);
      if (!token) {
        throw new Error("No authentication token returned");
      }
      return {
        token,
        user: { username, email: isEmail(username) ? username : "" },
      };
    } catch (err) {
      setError(getServerErrorMessage(err));
      return null;
    }
  };

  const handleSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill all signup fields.");
      return null;
    }
    if (!isEmail(email)) {
      setError("Please use a valid email address.");
      return null;
    }
    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters.");
      return null;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return null;
    }

    try {
      await axios.post(REGISTER_URL, {
        username,
        email,
        password,
        password_confirm: confirmPassword,
      });
      const loggedIn = await handleLogin();
      if (loggedIn) {
        setMessage("Signup successful. Logged in.");
      }
      return loggedIn;
    } catch (err) {
      setError(getServerErrorMessage(err));
      return null;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const authResult =
      mode === "login" ? await handleLogin() : await handleSignup();
    if (authResult) {
      onAuthSuccess(authResult);
    }

    setLoading(false);
  };

  return (
    <div className="auth-card">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="formTitle">{mode === "signup" ? "SignUp" : "Login"}</h2>
        <div className="inputDiv">
          <label className="inputLabel">
            {mode === "signup" ? "Username" : "User or Email"}
          </label>
          <input
            className="inputText"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={
              mode === "signup" ? "Choose a username" : "user or email"
            }
          />
        </div>

        {mode === "signup" && (
          <div className="inputDiv">
            <label className="inputLabel">Email</label>
            <input
              className="inputText"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        )}

        <div className="inputDiv">
          <label className="inputLabel">Password</label>
          <input
            className="inputText"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>

        {mode === "signup" && (
          <div className="inputDiv">
            <label className="inputLabel">Confirm Password</label>
            <input
              className="inputText"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
          </div>
        )}

        <button className="submitButton" type="submit" disabled={loading}>
          {loading ? "Processing..." : mode === "login" ? "Login" : "Sign Up"}
        </button>

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        <div className="auth-toggle">
          <label className="inputLabel">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </label>
          {mode === "login" ? (
            <button
              type="button"
              className={mode === "signup" ? "active " : "submitButton"}
              onClick={() => handleModeSwitch("signup")}
            >
              Sign Up
            </button>
          ) : (
            <button
              type="button"
              className={mode === "login" ? "active " : "submitButton"}
              onClick={() => handleModeSwitch("login")}
            >
              Login
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default AuthForm;

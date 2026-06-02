import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n/index.jsx";

export default function Login() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError(t("login.error"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">{t("app.title")}</h1>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        <input className="w-full border p-2 mb-4 rounded" placeholder={t("users.username")} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input className="w-full border p-2 mb-4 rounded" type="password" placeholder={t("users.password")} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">{t("login.btn")}</button>
      </form>
    </div>
  );
}

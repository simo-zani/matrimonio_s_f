import { useState } from "react";
import { loginDashboard } from "./lib/dashboardAuth";
import "./dashboard.css";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;

    setCaricamento(true);
    setErrore(false);

    const ok = loginDashboard(username, password);
    if (!ok) setErrore(true);
    else {
      // Forza re-render leggendo il nuovo valore di localStorage
      window.location.reload();
    }
    setCaricamento(false);
  }

  return (
    <div className="login-schermo">
      <div className="login-card">
        <h2>Area Riservata Sposi</h2>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Nome utente</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="es: stefano"
              disabled={caricamento}
              autoFocus
              autoComplete="username"
              required
            />
          </label>

          <label style={{ marginTop: "var(--sp-3)" }}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={caricamento}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={caricamento} style={{ marginTop: "var(--sp-4)" }}>
            {caricamento ? "Verifica in corso..." : "Accedi"}
          </button>
        </form>

        {errore && (
          <p className="login-errore">
            Nome utente o password errati. Riprova.
          </p>
        )}
      </div>
    </div>
  );
}



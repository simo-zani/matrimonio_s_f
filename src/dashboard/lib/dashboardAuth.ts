import { useState, useEffect } from "react";

const SESSION_KEY = "dashboard_sf2026_autenticato";

/**
 * Accesso semplificato: username nella lista + password corretta.
 * Nessun Supabase Auth — la sessione viene tenuta in localStorage.
 */
export function loginDashboard(username: string, password: string): boolean {
  const utenti = (import.meta.env.VITE_DASHBOARD_USERS || "")
    .split(",")
    .map((u: string) => u.trim().toLowerCase())
    .filter(Boolean);

  const passCorretta = import.meta.env.VITE_DASHBOARD_PASSWORD || "";

  const ok =
    utenti.includes(username.trim().toLowerCase()) &&
    password === passCorretta;

  if (ok) {
    localStorage.setItem(SESSION_KEY, "1");
  }
  return ok;
}

export function logoutDashboard() {
  localStorage.removeItem(SESSION_KEY);
  // Forza il reload così il componente si aggiorna
  window.location.reload();
}

/**
 * Hook che monitora la sessione locale.
 * Ritorna null (controllo in corso), true (autenticato), false (non autenticato).
 */
export function useSessioneAttiva() {
  const [attiva, setAttiva] = useState<boolean | null>(null);

  useEffect(() => {
    const valore = localStorage.getItem(SESSION_KEY);
    setAttiva(valore === "1");
  }, []);

  return attiva;
}

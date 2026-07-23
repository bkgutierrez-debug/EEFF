"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>EEFF · Fondos de Inversión</h1>
        <p style={styles.subtitle}>Ingresa con la cuenta que te fue creada por el administrador.</p>

        <label style={styles.label}>Correo</label>
        <input style={styles.input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

        <label style={styles.label}>Contraseña</label>
        <input style={styles.input} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F2ED", fontFamily: "sans-serif" },
  card: { background: "#fff", padding: 32, borderRadius: 10, width: 320, border: "1px solid #DCD7CA" },
  title: { fontSize: 18, margin: "0 0 4px 0", color: "#1B2430" },
  subtitle: { fontSize: 12.5, color: "#565F6E", margin: "0 0 20px 0" },
  label: { display: "block", fontSize: 12, color: "#565F6E", margin: "12px 0 4px" },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #DCD7CA", borderRadius: 6, fontSize: 14 },
  button: { marginTop: 20, width: "100%", padding: "10px", background: "#1B2430", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 },
  error: { marginTop: 12, color: "#A3323A", fontSize: 12.5 },
};

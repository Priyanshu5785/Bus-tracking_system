import { useState } from "react";
import { api } from "./api.js";

export default function Login({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      onAuth(await api(`/api/auth/${mode}`, { method: "POST", body: form }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="login">
      <h1>Where's my bus?</h1>
      <p className="sub">Live college bus locations, on your phone.</p>
      <form onSubmit={submit}>
        {mode === "register" && <input placeholder="Full name" value={form.name} onChange={set("name")} />}
        <input placeholder="Email" type="email" value={form.email} onChange={set("email")} />
        <input placeholder="Password" type="password" value={form.password} onChange={set("password")} />
        {error && <p className="error">{error}</p>}
        <button className="primary">{mode === "login" ? "Log in" : "Create student account"}</button>
      </form>
      <button className="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "New student? Register" : "Have an account? Log in"}
      </button>
    </main>
  );
}

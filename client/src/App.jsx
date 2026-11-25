import { useState } from "react";
import Login from "./Login.jsx";
import Driver from "./Driver.jsx";
import Student from "./Student.jsx";
import Admin from "./Admin.jsx";

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("session") || "null"));

  const save = (s) => {
    localStorage.setItem("session", JSON.stringify(s));
    setSession(s);
  };
  const logout = () => {
    localStorage.removeItem("session");
    setSession(null);
  };

  if (!session) return <Login onAuth={save} />;

  const { user } = session;
  return (
    <div className="shell">
      <header className="bar">
        <strong>Campus Bus</strong>
        <span>{user.name}</span>
        <button className="ghost" onClick={logout}>Log out</button>
      </header>
      {user.role === "driver" && <Driver session={session} />}
      {user.role === "student" && <Student session={session} />}
      {user.role === "admin" && <Admin session={session} />}
    </div>
  );
}

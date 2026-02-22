import { Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { request, setSessionToken } from "../lib/api";

export function SignUpRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("Creating account...");

    try {
      const result = await request<{ token: string }>("/api/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      await setSessionToken(result.token);
      await navigate({ to: "/board" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign up failed");
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <section className="auth-card">
        <div className="auth-logo">
          <img src="/icon.png" alt="App logo" />
        </div>
        <h1>Create your account</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Name</span>
            <input
              placeholder="Enter your name..."
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="Enter your email address..."
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="Create a password..."
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            Create account
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        {message && <p className="auth-message">{message}</p>}
      </section>
    </main>
  );
}

import { Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { request, setSessionToken } from "../lib/api";

export function LoginRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("Signing in...");

    try {
      const result = await request<{ token: string }>("/api/auth/sign-in/email", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await setSessionToken(result.token);
      await navigate({ to: "/board" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <section className="auth-card">
        <div className="auth-logo">
          <img src="/icon.png" alt="App logo" />
        </div>
        <h1>Log in to your account</h1>
        <form onSubmit={handleSubmit} className="auth-form">
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
              placeholder="Enter your password..."
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            Continue
          </button>
        </form>
        <p className="auth-link">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
        {message && <p className="auth-message">{message}</p>}
      </section>
    </main>
  );
}

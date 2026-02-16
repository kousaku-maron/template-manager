import { useState } from 'preact/hooks';
import { FormField } from './FormField';

export function SignInForm() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Signing in...');

    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: String(data.get('email') || ''),
          password: String(data.get('password') || ''),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Signed in. Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 600);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Sign in failed');
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="stack-sm">
        <FormField label="Email" name="email" type="email" placeholder="you@example.com" required />
        <FormField label="Password" name="password" type="password" placeholder="Password" required />
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      {status && <p className="auth-status">{status}</p>}
    </>
  );
}

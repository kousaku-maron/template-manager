import { useState } from 'preact/hooks';
import { FormField } from './FormField';

export function SignUpForm() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Creating account...');

    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    try {
      const res = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          password: String(data.get('password') || ''),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('Account created. Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 600);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Sign up failed');
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="stack-sm">
        <FormField label="Name" name="name" placeholder="Your name" required />
        <FormField label="Email" name="email" type="email" placeholder="you@example.com" required />
        <FormField label="Password" name="password" type="password" placeholder="8+ characters" required minLength={8} />
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      {status && <p className="auth-status">{status}</p>}
    </>
  );
}

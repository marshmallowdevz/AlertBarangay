import { useState } from 'react';

export default function LoginView({ onSignIn, configMessage = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSignIn({ email: email.trim(), password });
    } catch (signInError) {
      setError(signInError.message || 'Unable to sign in. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand-logo auth-logo"><span aria-hidden="true">AB</span></div>
        <h1>Barangay Official</h1>
        <p className="muted">Sign in with your provisioned official account.</p>
        {configMessage && <p className="form-error" role="alert">{configMessage}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" className="btn btn-maroon" disabled={submitting || Boolean(configMessage)}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

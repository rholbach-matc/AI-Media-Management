import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function LoginPage() {
  const { login, loading, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await login(username.trim(), password);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to sign in';
      setError(message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-charcoal px-4 py-10 text-ink">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold">Grok Organizer</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to your media workspace</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-800 bg-panel p-6 shadow-2xl shadow-black/25"
        >
          <div className="space-y-5">
            <Input
              label="Username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <div className="mt-5 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? <LoadingSpinner label="Signing in" /> : 'Sign In'}
          </Button>
        </form>
      </section>
    </main>
  );
}

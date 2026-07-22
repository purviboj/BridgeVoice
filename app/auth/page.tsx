'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { getApiBaseUrl } from '@/lib/api';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || `${mode} failed`);
      }

      setMessage(data.message || `${mode === 'signup' ? 'Signup' : 'Login'} successful`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 md:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Login / Signup</h1>
        <p className="mt-2 text-slate-600">
          Use your email to create an account or sign in.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === 'signup'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Signup
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === 'login'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Login
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {loading ? 'Working...' : mode === 'signup' ? 'Create account' : 'Login'}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-rose-700">{error}</p>
        ) : null}
      </section>
    </main>
  );
}

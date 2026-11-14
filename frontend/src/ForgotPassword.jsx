import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from './api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-200 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-brand-50 text-2xl font-bold">$</span>
          </div>
          <h1 className="text-3xl font-bold text-brand-900">Pennyroom</h1>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-brand-900">Forgot your password?</h2>
          <p className="text-sm text-brand-700 mt-1">
            Enter your email and we'll send you a link to reset it.
          </p>
        </div>

        {sent ? (
          <div
            role="status"
            className="bg-brand-50 border border-brand-200 text-brand-800 text-sm px-4 py-3 rounded-xl"
          >
            If that email is registered, we've sent a reset link. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-800 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-brand-600
                           focus:border-transparent transition"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-700 text-brand-50 font-semibold
                         py-3 rounded-xl hover:bg-brand-800
                         transition duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

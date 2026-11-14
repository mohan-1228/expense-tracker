import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login, resendVerification } from './api';

export default function Login({ onLogin, onShowSignup, notice }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent

  async function handleSubmit(e) {
    e.preventDefault();

    setError('');
    setNeedsVerification(false);
    setResendState('idle');
    setLoading(true);

    try {
      const data = await login(email.trim().toLowerCase(), password);

      // Save authentication token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Notify parent component of successful login
      onLogin();

    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setNeedsVerification(err.code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendState('sending');
    try {
      await resendVerification(email.trim().toLowerCase());
    } finally {
      setResendState('sent');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-200 px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

        {/* Logo and App Name */}
        <div className="text-center mb-8">

          <div className="w-14 h-14 bg-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-brand-50 text-2xl font-bold">$</span>
          </div>

          <h1 className="text-3xl font-bold text-brand-900">
            Pennyroom
          </h1>

          <p className="text-brand-700 mt-2 text-sm">
            Your AI-powered expense tracker
          </p>

        </div>

        {/* Welcome Text */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-brand-900">
            Welcome back
          </h2>

          <p className="text-sm text-brand-700 mt-1">
            Sign in to manage your finances.
          </p>
        </div>

        {notice && (
            <div
                role="status"
                className="mb-5 bg-brand-50 border border-brand-200 text-brand-800
                        text-sm px-4 py-3 rounded-xl"
            >
                {notice}
            </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-brand-800 mb-2"
            >
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

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-brand-800"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-brand-600
                           focus:border-transparent transition"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2
                           text-sm text-brand-700 hover:text-brand-800"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>

            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-600
                         text-sm px-4 py-3 rounded-xl space-y-2"
            >
              <p>{error}</p>
              {needsVerification && (
                resendState === 'sent' ? (
                  <p className="text-brand-700">
                    If that email needs verifying, a new link is on its way.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending'}
                    className="font-semibold text-brand-700 hover:underline disabled:opacity-50"
                  >
                    {resendState === 'sending' ? 'Sending...' : 'Resend verification email'}
                  </button>
                )
              )}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-700 text-brand-50 font-semibold
                       py-3 rounded-xl hover:bg-brand-800
                       transition duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        {/* Signup Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-brand-700">
            Don't have an account?{' '}
            <button
                type="button"
                onClick={onShowSignup}
                className="text-brand-700 font-semibold hover:underline"
            >
                Create an account
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from './api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState(token ? 'verifying' : 'missing');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    verifyEmail(token)
      .then(() => setStatus('verified'))
      .catch((err) => {
        setError(err.message || 'Something went wrong. Please try again.');
        setStatus('error');
      });
  }, [token]);

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
          <h2 className="text-2xl font-semibold text-brand-900">Verify your email</h2>
        </div>

        {status === 'verifying' && (
          <div
            role="status"
            className="bg-brand-50 border border-brand-200 text-brand-800 text-sm px-4 py-3 rounded-xl"
          >
            Verifying your email...
          </div>
        )}

        {status === 'verified' && (
          <div
            role="status"
            className="bg-brand-50 border border-brand-200 text-brand-800 text-sm px-4 py-3 rounded-xl"
          >
            Your email is verified. You can now sign in.
          </div>
        )}

        {status === 'missing' && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl"
          >
            This link is missing a verification token.
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl"
          >
            {error}
          </div>
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

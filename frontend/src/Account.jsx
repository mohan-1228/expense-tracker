import { useState } from 'react';
import { Link } from 'react-router-dom';
import { changePassword } from './api';

export default function Account() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link to="/dashboard" className="text-sm text-violet-600 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Account</h1>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow"
        >
          <h2 className="font-semibold text-gray-900">Change password</h2>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Current password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Confirm new password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-500
                       px-5 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

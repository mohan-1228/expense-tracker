import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getCurrentUser,
  updateProfile,
  changePassword,
  getCategories,
  createCategory,
  deleteCategory,
} from './api';

const inputClass =
  'w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Password' },
  { id: 'categories', label: 'Categories' },
];

function ProfileTab() {
  const me = getCurrentUser();
  const [name, setName] = useState(me?.name || '');
  const [email, setEmail] = useState(me?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { user } = await updateProfile(name.trim(), email.trim());
      localStorage.setItem('user', JSON.stringify(user));
      window.location.reload();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-brand-800">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-brand-800">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-900
                   px-5 py-2 font-semibold text-brand-50 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}

function PasswordTab() {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-brand-800">
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
        <label className="mb-1 block text-xs font-semibold text-brand-800">
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
        <label className="mb-1 block text-xs font-semibold text-brand-800">
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
        className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-900
                   px-5 py-2 font-semibold text-brand-50 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Update password'}
      </button>
    </form>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const rows = await getCategories();
        if (!cancelled) setCategories(rows);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      await createCategory(name.trim());
      setName('');
      setRefresh((v) => v + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(category) {
    const ok = window.confirm(`Delete category "${category.name}"?`);
    if (!ok) return;

    setDeleteError('');
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      setRefresh((v) => v + 1);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const defaultCategories = categories.filter((c) => c.is_default);
  const customCategories = categories.filter((c) => !c.is_default);

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3">
        <h3 className="text-sm font-semibold text-brand-800">Add a custom category</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name (e.g. Pet supplies)"
          required
          className={inputClass}
        />
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-900
                     px-5 py-2 font-semibold text-brand-50 disabled:opacity-50"
        >
          {creating ? 'Adding...' : 'Add category'}
        </button>
      </form>

      {loading && <p className="text-brand-700">Loading categories...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-brand-800">
              Your categories ({customCategories.length})
            </h3>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
            {customCategories.length === 0 ? (
              <p className="mt-3 text-brand-700">No custom categories yet. Add one above.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {customCategories.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="font-medium text-brand-900">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="rounded-xl border border-red-200 bg-white
                                 px-3 py-1.5 text-sm font-semibold text-red-600
                                 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === c.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brand-800">Default categories</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {defaultCategories.map((c) => (
                <li
                  key={c.id}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-brand-800"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function Account() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some((t) => t.id === requestedTab) ? requestedTab : 'profile';

  return (
    <div className="min-h-screen bg-brand-200 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/dashboard" className="text-sm text-brand-700 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Account</h1>

        <div className="mt-6 flex gap-2 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-brand-700 text-brand-800'
                  : 'border-transparent text-brand-700 hover:text-brand-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'password' && <PasswordTab />}
          {activeTab === 'categories' && <CategoriesTab />}
        </div>
      </div>
    </div>
  );
}

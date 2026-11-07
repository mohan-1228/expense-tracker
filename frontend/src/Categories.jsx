import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, createCategory, deleteCategory } from './api';

export default function Categories() {
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
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="text-sm text-violet-600 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Categories</h1>

        {/* Create category */}
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl bg-white p-5 shadow space-y-3"
        >
          <h2 className="font-semibold text-gray-900">Add a custom category</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name (e.g. Pet supplies)"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2
                       focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-500
                       px-5 py-2 font-semibold text-white disabled:opacity-50"
          >
            {creating ? 'Adding...' : 'Add category'}
          </button>
        </form>

        {loading && <p className="mt-6 text-gray-500">Loading categories...</p>}
        {error && <p className="mt-6 text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <section className="mt-6 rounded-2xl bg-white p-5 shadow">
              <h2 className="font-semibold text-gray-900">
                Your categories ({customCategories.length})
              </h2>
              {deleteError && (
                <p className="mt-2 text-sm text-red-600">{deleteError}</p>
              )}
              {customCategories.length === 0 ? (
                <p className="mt-3 text-gray-500">
                  No custom categories yet. Add one above.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {customCategories.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <span className="font-medium text-gray-900">{c.name}</span>
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
            </section>

            <section className="mt-6 rounded-2xl bg-white p-5 shadow">
              <h2 className="font-semibold text-gray-900">Default categories</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {defaultCategories.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

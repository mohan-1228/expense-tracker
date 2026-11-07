import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGroups, createGroup } from './api';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const rows = await getGroups();
        if (!cancelled) setGroups(rows);
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
      await createGroup(name.trim(), description.trim());
      setName('');
      setDescription('');
      setRefresh((v) => v + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-200 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="text-sm text-brand-700 hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-brand-900">Groups</h1>

        {/* Create group */}
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl bg-white p-5 shadow space-y-3"
        >
          <h2 className="font-semibold text-brand-900">Create a group</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name (e.g. Weekend trip)"
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-2
                       focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-xl border border-gray-300 px-4 py-2
                       focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-900
                       px-5 py-2 font-semibold text-brand-50 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create group'}
          </button>
        </form>

        {/* Group list */}
        <div className="mt-6 space-y-3">
          {loading && <p className="text-brand-700">Loading groups...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!loading && !error && groups.length === 0 && (
            <p className="text-brand-700">
              You are not in any groups yet. Create one above.
            </p>
          )}
          {groups.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="block rounded-2xl bg-white p-5 shadow hover:shadow-md transition"
            >
              <p className="font-semibold text-brand-900">{g.name}</p>
              {g.description && (
                <p className="mt-1 text-sm text-brand-700">{g.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deactivateRecurringTemplate,
  reactivateRecurringTemplate,
  getCategories,
} from './api';

const money = (n) => `$${Number(n).toFixed(2)}`;

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

function todayLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function TemplateForm({ categories, initialTemplate, onClose, onSaved, submitTemplate }) {
  const [name, setName] = useState(initialTemplate?.name || '');
  const [amount, setAmount] = useState(initialTemplate ? String(initialTemplate.amount) : '');
  const [categoryId, setCategoryId] = useState(
    initialTemplate?.category_id ? String(initialTemplate.category_id) : ''
  );
  const [frequency, setFrequency] = useState(initialTemplate?.frequency || 'monthly');
  const [nextOccurrence, setNextOccurrence] = useState(
    initialTemplate?.next_occurrence?.slice(0, 10) || todayLocal()
  );
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await submitTemplate({
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: categoryId ? Number(categoryId) : null,
        frequency,
        next_occurrence: nextOccurrence,
        description: description.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md space-y-4 rounded-2xl bg-brand-50 p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-brand-900">
          {initialTemplate ? 'Edit recurring expense' : 'New recurring expense'}
        </h3>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-800">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rent"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-800">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-800">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className={inputClass}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f[0].toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-800">Next date</label>
            <input
              type="date"
              value={nextOccurrence}
              onChange={(e) => setNextOccurrence(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-800">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-800">
            Description (optional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this for?"
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-200/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-900
                       px-5 py-2 text-sm font-semibold text-brand-50 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RecurringTemplates() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [reactivatingId, setReactivatingId] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.error('Could not load categories', err));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const rows = await getRecurringTemplates();
        if (!cancelled) setTemplates(rows);
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

  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  async function handleDeactivate(template) {
    const ok = window.confirm(`Stop "${template.name}" from generating future expenses?`);
    if (!ok) return;

    setActionError('');
    setDeactivatingId(template.id);
    try {
      await deactivateRecurringTemplate(template.id);
      setRefresh((v) => v + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleReactivate(template) {
    setActionError('');
    setReactivatingId(template.id);
    try {
      await reactivateRecurringTemplate(template.id);
      setRefresh((v) => v + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setReactivatingId(null);
    }
  }

  const activeTemplates = templates.filter((t) => t.is_active);
  const inactiveTemplates = templates.filter((t) => !t.is_active);

  function renderRow(template) {
    return (
      <li key={template.id} className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-brand-900">
            {template.name}
            {!template.is_active && (
              <span className="ml-2 text-xs font-semibold text-brand-700">(inactive)</span>
            )}
          </p>
          <p className="text-sm text-brand-700">
            {template.frequency} · next {template.next_occurrence.slice(0, 10)} ·{' '}
            {categoryNameById[template.category_id] || 'No category'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-brand-900">{money(template.amount)}</span>
          {template.is_active && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingTemplate(template)}
                className="rounded-xl border border-brand-200 bg-brand-50
                           px-3 py-1.5 text-sm font-semibold text-brand-800
                           transition hover:bg-brand-200/20"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeactivate(template)}
                disabled={deactivatingId === template.id}
                className="rounded-xl border border-red-200 bg-brand-50
                           px-3 py-1.5 text-sm font-semibold text-red-600
                           transition hover:bg-red-50 disabled:opacity-50"
              >
                {deactivatingId === template.id ? 'Stopping...' : 'Stop'}
              </button>
            </div>
          )}
          {!template.is_active && (
            <button
              type="button"
              onClick={() => handleReactivate(template)}
              disabled={reactivatingId === template.id}
              className="rounded-xl border border-brand-200 bg-brand-50
                         px-3 py-1.5 text-sm font-semibold text-brand-800
                         transition hover:bg-brand-200/20 disabled:opacity-50"
            >
              {reactivatingId === template.id ? 'Reactivating...' : 'Reactivate'}
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="min-h-screen bg-brand-200 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="text-sm text-brand-700 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-brand-900">Recurring expenses</h1>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-900
                       px-4 py-2 font-semibold text-brand-50"
          >
            + New recurring expense
          </button>
        </div>
        <p className="mt-1 text-brand-700">
          Automatically creates an expense on each occurrence date.
        </p>

        {loading && <p className="mt-6 text-brand-700">Loading...</p>}
        {error && <p className="mt-6 text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <section className="mt-6 rounded-2xl bg-brand-50 p-5 shadow">
              <h2 className="font-semibold text-brand-900">
                Active ({activeTemplates.length})
              </h2>
              {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
              {activeTemplates.length === 0 ? (
                <p className="mt-3 text-brand-700">
                  No recurring expenses yet. Create one above.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {activeTemplates.map(renderRow)}
                </ul>
              )}
            </section>

            {inactiveTemplates.length > 0 && (
              <section className="mt-6 rounded-2xl bg-brand-50 p-5 shadow">
                <h2 className="font-semibold text-brand-900">
                  Inactive ({inactiveTemplates.length})
                </h2>
                <ul className="mt-3 divide-y divide-gray-100">
                  {inactiveTemplates.map(renderRow)}
                </ul>
              </section>
            )}
          </>
        )}

        {showForm && (
          <TemplateForm
            categories={categories}
            onClose={() => setShowForm(false)}
            onSaved={() => setRefresh((v) => v + 1)}
            submitTemplate={createRecurringTemplate}
          />
        )}

        {editingTemplate && (
          <TemplateForm
            categories={categories}
            initialTemplate={editingTemplate}
            onClose={() => setEditingTemplate(null)}
            onSaved={() => setRefresh((v) => v + 1)}
            submitTemplate={(template) => updateRecurringTemplate(editingTemplate.id, template)}
          />
        )}
      </div>
    </div>
  );
}

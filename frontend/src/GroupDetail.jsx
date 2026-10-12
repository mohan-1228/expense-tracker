import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AddExpenseForm from './AddExpenseForm';
import {
  getGroup,
  getGroupBalances,
  getCurrentUser,
  addGroupMember,
  settleWithMember,
  getCategories,
  createGroupExpense,
} from './api';

const money = (n) => `$${Number(n).toFixed(2)}`;

export default function GroupDetail() {
  const { groupId } = useParams();
  const me = getCurrentUser();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [settlingId, setSettlingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);

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
        const [groupData, balanceData] = await Promise.all([
          getGroup(groupId),
          getGroupBalances(groupId),
        ]);
        if (!cancelled) {
          setGroup(groupData);
          setBalances(balanceData);
        }
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
  }, [groupId, refresh]);


  function todayLocal() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

  function describe(b) {
    if (b.owes === me?.id) {
      return { text: `You owe ${b.owedToName}`, color: 'text-red-600' };
    }
    if (b.owedTo === me?.id) {
      return { text: `${b.owesName} owes you`, color: 'text-emerald-600' };
    }
    return { text: `${b.owesName} owes ${b.owedToName}`, color: 'text-gray-700' };
  }

  async function handleSettle(b) {
    const iOwe = b.owes === me.id;
    const otherId = iOwe ? b.owedTo : b.owes;
    const otherName = iOwe ? b.owedToName : b.owesName;

    const ok = window.confirm(
      `Mark everything between you and ${otherName} in this group as settled?`
    );
    if (!ok) return;

    setActionError('');
    setSettlingId(otherId);
    try {
      await settleWithMember(groupId, otherId);
      setRefresh((v) => v + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSettlingId(null);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberError('');
    setAdding(true);
    try {
      await addGroupMember(groupId, email.trim().toLowerCase());
      setEmail('');
      setRefresh((v) => v + 1);
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/groups" className="text-sm text-violet-600 hover:underline">
          ← Back to groups
        </Link>

        {loading && !group && <p className="mt-6 text-gray-500">Loading...</p>}
        {error && <p className="mt-6 text-red-600">{error}</p>}

        {group && (
          <>
            <div className="mt-2 flex items-center justify-between gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-500
                            px-4 py-2 font-semibold text-white"
                >
                    + Add expense
                </button>
            </div>
            {group.description && (
                <p className="mt-1 text-gray-500">{group.description}</p>
            )}

            {/* Balances */}
            <section className="mt-6 rounded-2xl bg-white p-5 shadow">
              <h2 className="font-semibold text-gray-900">Balances</h2>
              {actionError && (
                <p className="mt-2 text-sm text-red-600">{actionError}</p>
              )}
              {balances.length === 0 ? (
                <p className="mt-3 text-gray-500">Everyone is settled up.</p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {balances.map((b) => {
                    const d = describe(b);
                    const involvesMe =
                      me && (b.owes === me.id || b.owedTo === me.id);
                    const otherId = b.owes === me?.id ? b.owedTo : b.owes;
                    return (
                      <li
                        key={`${b.owes}-${b.owedTo}`}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <span className={`font-medium ${d.color}`}>{d.text}</span>
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold ${d.color}`}>
                            {money(b.amount)}
                          </span>
                          {involvesMe && (
                            <button
                              type="button"
                              onClick={() => handleSettle(b)}
                              disabled={settlingId === otherId}
                              className="rounded-xl border border-violet-200 bg-white
                                         px-3 py-1.5 text-sm font-semibold text-violet-700
                                         transition hover:bg-violet-50
                                         disabled:opacity-50"
                            >
                              {settlingId === otherId ? 'Settling...' : 'Settle'}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Members */}
            <section className="mt-6 rounded-2xl bg-white p-5 shadow">
              <h2 className="font-semibold text-gray-900">
                Members ({group.members.length})
              </h2>
              <ul className="mt-3 divide-y divide-gray-100">
                {group.members.map((m) => (
                  <li key={m.id} className="py-3">
                    <p className="font-medium text-gray-900">
                      {m.name}
                      {m.id === me?.id && (
                        <span className="ml-2 text-xs text-violet-600">(you)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">{m.email}</p>
                  </li>
                ))}
              </ul>

              <form onSubmit={handleAddMember} className="mt-4 flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Add a member by email"
                  required
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2
                             focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-500
                             px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add'}
                </button>
              </form>
              {memberError && (
                <p className="mt-2 text-sm text-red-600">{memberError}</p>
              )}
            </section>
            {showForm && (
              <AddExpenseForm
                categories={categories}
                defaultDate={todayLocal()}
                title="Add group expense"
                note={`You paid. Split equally among ${group.members.length} members.`}
                submitExpense={(expense) => createGroupExpense(groupId, expense)}
                onClose={() => setShowForm(false)}
                onAdded={() => setRefresh((v) => v + 1)}
              />
            )}
            
          </>
        )}
      </div>
    </div>
  );
}
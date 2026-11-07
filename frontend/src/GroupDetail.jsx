import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AddExpenseForm from './AddExpenseForm';
import {
  getGroup,
  getGroupBalances,
  getCurrentUser,
  addGroupMember,
  settleWithMember,
  getCategories,
  createGroupExpense,
  getExpenses,
  updateGroupExpense,
  deleteGroupExpense,
  leaveGroup,
  removeGroupMember,
  deleteGroup,
} from './api';

const money = (n) => `$${Number(n).toFixed(2)}`;

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const me = getCurrentUser();

  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [expenseError, setExpenseError] = useState('');

  const [settlingId, setSettlingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [memberActionError, setMemberActionError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [groupActionError, setGroupActionError] = useState('');

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
        const [groupData, balanceData, allExpenses] = await Promise.all([
          getGroup(groupId),
          getGroupBalances(groupId),
          getExpenses(),
        ]);
        if (!cancelled) {
          setGroup(groupData);
          setBalances(balanceData);
          setExpenses(
            (Array.isArray(allExpenses) ? allExpenses : []).filter(
              (e) => String(e.group_id) === String(groupId)
            )
          );
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

  const isCreator = me && group?.created_by === me.id;

  async function handleRemoveMember(member) {
    const ok = window.confirm(`Remove ${member.name} from this group?`);
    if (!ok) return;

    setMemberActionError('');
    setRemovingMemberId(member.id);
    try {
      await removeGroupMember(groupId, member.id);
      setRefresh((v) => v + 1);
    } catch (err) {
      setMemberActionError(err.message);
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleLeaveGroup() {
    const ok = window.confirm('Leave this group?');
    if (!ok) return;

    setGroupActionError('');
    setLeaving(true);
    try {
      await leaveGroup(groupId);
      navigate('/groups');
    } catch (err) {
      setGroupActionError(err.message);
      setLeaving(false);
    }
  }

  async function handleDeleteGroup() {
    const ok = window.confirm(`Delete "${group.name}"? This cannot be undone.`);
    if (!ok) return;

    setGroupActionError('');
    setDeletingGroup(true);
    try {
      await deleteGroup(groupId);
      navigate('/groups');
    } catch (err) {
      setGroupActionError(err.message);
      setDeletingGroup(false);
    }
  }

  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  function handleEdit(expense) {
    setExpenseError('');
    setEditingExpense(expense);
  }

  async function handleDelete(expense) {
    const ok = window.confirm(`Delete "${expense.description || 'this expense'}"?`);
    if (!ok) return;

    setExpenseError('');
    setDeletingId(expense.id);
    try {
      await deleteGroupExpense(groupId, expense.id);
      setRefresh((v) => v + 1);
    } catch (err) {
      setExpenseError(err.message);
    } finally {
      setDeletingId(null);
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
                <div className="flex items-center gap-2">
                  <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-500
                              px-4 py-2 font-semibold text-white"
                  >
                      + Add expense
                  </button>
                  {isCreator ? (
                    <button
                        type="button"
                        onClick={handleDeleteGroup}
                        disabled={deletingGroup}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2
                                   text-sm font-semibold text-red-600 hover:bg-red-50
                                   disabled:opacity-50"
                    >
                        {deletingGroup ? 'Deleting...' : 'Delete group'}
                    </button>
                  ) : (
                    <button
                        type="button"
                        onClick={handleLeaveGroup}
                        disabled={leaving}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2
                                   text-sm font-semibold text-red-600 hover:bg-red-50
                                   disabled:opacity-50"
                    >
                        {leaving ? 'Leaving...' : 'Leave group'}
                    </button>
                  )}
                </div>
            </div>
            {group.description && (
                <p className="mt-1 text-gray-500">{group.description}</p>
            )}
            {groupActionError && (
                <p className="mt-2 text-sm text-red-600">{groupActionError}</p>
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

            {/* Expenses */}
            <section className="mt-6 rounded-2xl bg-white p-5 shadow">
              <h2 className="font-semibold text-gray-900">
                Expenses ({expenses.length})
              </h2>
              {expenseError && (
                <p className="mt-2 text-sm text-red-600">{expenseError}</p>
              )}
              {expenses.length === 0 ? (
                <p className="mt-3 text-gray-500">No expenses yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {expenses
                    .slice()
                    .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1))
                    .map((expense) => {
                      const canManage = me && expense.paid_by === me.id;
                      return (
                        <li
                          key={expense.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {expense.description || 'Untitled expense'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {canManage ? 'You' : expense.paid_by_name} paid ·{' '}
                              {categoryNameById[expense.category_id] || 'No category'} ·{' '}
                              {expense.expense_date}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">
                              {money(expense.total_amount)}
                            </span>
                            {canManage && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(expense)}
                                  className="rounded-xl border border-violet-200 bg-white
                                             px-3 py-1.5 text-sm font-semibold text-violet-700
                                             transition hover:bg-violet-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(expense)}
                                  disabled={deletingId === expense.id}
                                  className="rounded-xl border border-red-200 bg-white
                                             px-3 py-1.5 text-sm font-semibold text-red-600
                                             transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingId === expense.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
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
              {memberActionError && (
                <p className="mt-2 text-sm text-red-600">{memberActionError}</p>
              )}
              <ul className="mt-3 divide-y divide-gray-100">
                {group.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {m.name}
                        {m.id === me?.id && (
                          <span className="ml-2 text-xs text-violet-600">(you)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{m.email}</p>
                    </div>
                    {isCreator && m.id !== me?.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        disabled={removingMemberId === m.id}
                        className="rounded-xl border border-red-200 bg-white
                                   px-3 py-1.5 text-sm font-semibold text-red-600
                                   transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {removingMemberId === m.id ? 'Removing...' : 'Remove'}
                      </button>
                    )}
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

            {editingExpense && (
              <AddExpenseForm
                categories={categories}
                defaultDate={editingExpense.expense_date}
                title="Edit group expense"
                submitLabel="Save changes"
                note={`Re-splits the total evenly among ${group.members.length} members.`}
                initialExpense={{
                  amount: editingExpense.total_amount,
                  expense_date: editingExpense.expense_date,
                  description: editingExpense.description,
                  category_id: editingExpense.category_id,
                }}
                submitExpense={(expense) =>
                  updateGroupExpense(groupId, editingExpense.id, expense)
                }
                onClose={() => setEditingExpense(null)}
                onAdded={() => setRefresh((v) => v + 1)}
              />
            )}

          </>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, deleteExpense, deleteGroupExpense } from "./api";
import { Star } from "lucide-react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function prettyDate(dateStr) {
  // dateStr looks like "2026-10-11"; build a local date so it can't shift a day
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-brand-700">{label}</span>
      <span className="text-right text-sm font-semibold text-brand-900">
        {children}
      </span>
    </div>
  );
}

export default function ExpenseDetail({ expense, onClose, onEdit, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const me = getCurrentUser();
  const iPaid = expense.is_group && me && expense.paid_by === me.id;
  // Personal expenses are always yours to manage; group expenses only if you paid for them.
  const canManage = !expense.is_group || iPaid;

  async function handleDelete() {
    const ok = window.confirm(
      `Delete "${expense.description || "this expense"}"?`
    );
    if (!ok) return;

    setError("");
    setDeleting(true);
    try {
      if (expense.is_group) {
        await deleteGroupExpense(expense.group_id, expense.id);
      } else {
        await deleteExpense(expense.id);
      }
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-brand-50 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">
              {expense.description}
              {expense.is_group && (
                <Star
                  size={16}
                  className="ml-1.5 inline-block fill-orange-500 text-orange-500"
                  aria-label="Group expense"
                />
              )}
            </h3>
            <p className="text-sm text-brand-700">
              {expense.is_group ? "Group expense" : "Personal expense"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-brand-700 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <Row label={expense.is_group ? "Your share" : "Amount"}>
            {usd.format(expense.amount)}
          </Row>

          {expense.is_group && (
            <>
              <Row label="Total expense">
                {usd.format(Number(expense.total_amount))}
              </Row>
              <Row label="Paid by">
                {iPaid ? "You" : expense.paid_by_name}
              </Row>
              <Row label="Group">
                <Link
                  to={`/groups/${expense.group_id}`}
                  className="text-brand-700 hover:underline"
                >
                  {expense.group_name}
                </Link>
              </Row>
              <Row label="Status">
                {iPaid
                  ? "You paid the full amount"
                  : expense.is_settled
                  ? "Settled"
                  : `You owe ${expense.paid_by_name}`}
              </Row>
            </>
          )}

          <Row label="Category">{expense.category}</Row>
          <Row label="Date">{prettyDate(expense.date)}</Row>
        </div>

        {expense.is_group && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-brand-700">
                <Star size={12} className="fill-orange-500 text-orange-500" />
                Group expense. Your dashboard counts only your share.
            </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {canManage && (
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
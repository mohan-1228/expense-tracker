import { useEffect } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "./api";
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
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">
        {children}
      </span>
    </div>
  );
}

export default function ExpenseDetail({ expense, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const me = getCurrentUser();
  const iPaid = expense.is_group && me && expense.paid_by === me.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
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
            <p className="text-sm text-slate-500">
              {expense.is_group ? "Group expense" : "Personal expense"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
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
                  className="text-violet-600 hover:underline"
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
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                <Star size={12} className="fill-orange-500 text-orange-500" />
                Group expense. Your dashboard counts only your share.
            </p>
        )}
      </div>
    </div>
  );
}
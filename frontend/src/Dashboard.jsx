import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ExpenseDetail from "./ExpenseDetail";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Wallet,
  Receipt,
  TrendingUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Sparkles,
  Plus,
  Users,
  Star,
} from "lucide-react";

import { getExpenses, getCategories } from "./api";
import AddExpenseForm from "./AddExpenseForm";

// Category colors
const CATEGORY_COLORS = {
  food: "#F97316",
  grocery: "#22C55E",
  groceries: "#22C55E",
  gas: "#3B82F6",
  fitness: "#8B5CF6",
  shopping: "#EC4899",
  bills: "#EF4444",
  entertainment: "#F59E0B",
  travel: "#06B6D4",
  other: "#64748B",
};

const money = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

function getColor(category) {
  return CATEGORY_COLORS[category.toLowerCase()] || "#64748B";
}

// Build dates without UTC timezone shifts
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

function normalizeExpense(expense, categoryNames) {
  const amount = Number(expense.amount);

  const date = String(
    expense.date || expense.expense_date || ""
  ).slice(0, 10);

  const category =
    typeof expense.category === "string"
      ? expense.category
      : expense.category?.name ||
        categoryNames[expense.category_id] ||
        "Other";

  return {
    ...expense,
    amount,
    date,
    category,
    description: expense.description || "Untitled expense",
  };
}

export default function Dashboard({ onLogout }) {
  const today = new Date();

  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(() =>
    dateKey(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [detailExpense, setDetailExpense] = useState(null);

  // Load expenses from backend
  useEffect(() => {
    let cancelled = false;

    async function loadExpenses() {
      setLoading(true);
      setError("");

      try {
        const [expenseResponse, categoryResponse] = await Promise.all([
            getExpenses(),
            getCategories(),
        ]);

        const categoryRows = Array.isArray(categoryResponse) ? categoryResponse : [];
        const categoryNames = Object.fromEntries(
            categoryRows.map((c) => [c.id, c.name])
        );

        const rows = Array.isArray(expenseResponse)
            ? expenseResponse
            : expenseResponse?.expenses || [];

        const cleaned = rows
            .map((expense) => normalizeExpense(expense, categoryNames))
            .filter(
            (expense) =>
                Number.isFinite(expense.amount) &&
                expense.amount >= 0 &&
                /^\d{4}-\d{2}-\d{2}$/.test(expense.date)
        );

        if (!cancelled) {
            setCategories(categoryRows);
            setExpenses(cleaned);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load expenses.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExpenses();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthPrefix = dateKey(year, month, 1).slice(0, 7);

  const monthName = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Expenses for current displayed month
  const monthlyExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(monthPrefix)),
    [expenses, monthPrefix]
  );

  const totalSpent = monthlyExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const dailyAverage = totalSpent / daysInMonth;

  // Spending grouped by category
  const categoryData = useMemo(() => {
    const totals = {};

    monthlyExpenses.forEach((expense) => {
      totals[expense.category] =
        (totals[expense.category] || 0) + expense.amount;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        color: getColor(name),
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyExpenses]);

  const topCategory = categoryData[0]?.name || "None";

  // Daily spending totals for calendar and chart
  const dailyData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = dateKey(year, month, day);

      const total = monthlyExpenses
        .filter((expense) => expense.date === date)
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        day,
        date,
        total,
      };
    });
  }, [monthlyExpenses, daysInMonth, year, month]);

  const maxDailySpending = Math.max(
    0,
    ...dailyData.map((item) => item.total)
  );

  const firstWeekday = new Date(year, month, 1).getDay();

  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...dailyData,
  ];

  // Expenses on selected calendar day
  const selectedExpenses = monthlyExpenses.filter(
    (expense) =>
      expense.date === selectedDate &&
      (categoryFilter === "All" ||
        expense.category === categoryFilter)
  );

  const selectedTotal = monthlyExpenses
    .filter((expense) => expense.date === selectedDate)
    .reduce((sum, expense) => sum + expense.amount, 0);

  function changeMonth(direction) {
    const next = new Date(year, month + direction, 1);

    setViewMonth(next);
    setSelectedDate(
      dateKey(next.getFullYear(), next.getMonth(), 1)
    );
    setCategoryFilter("All");
  }

  function getDayColor(amount) {
    if (amount === 0) return "bg-slate-50 hover:bg-slate-100";

    const intensity = amount / maxDailySpending;

    if (intensity > 0.75)
      return "bg-purple-200 hover:bg-purple-300";

    if (intensity > 0.5)
      return "bg-orange-200 hover:bg-orange-300";

    if (intensity > 0.25)
      return "bg-emerald-200 hover:bg-emerald-300";

    return "bg-sky-100 hover:bg-sky-200";
  }

  const selectedDateLabel = new Date(
    Number(selectedDate.slice(0, 4)),
    Number(selectedDate.slice(5, 7)) - 1,
    Number(selectedDate.slice(8, 10))
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-slate-800">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 p-3 text-white">
              <Wallet size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Pennyroom
              </h1>
              <p className="text-xs text-slate-500">
                Your money, made simple.
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <LogOut size={17} />
            Logout
          </button>

        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-5 py-8">

        {/* WELCOME SECTION */}
        <section className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <div className="mb-2 flex items-center gap-2 text-violet-600">
              <Sparkles size={18} />
              <span className="text-sm font-semibold">
                Your financial overview
              </span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight">
              Spending Dashboard
            </h2>

            <p className="mt-2 text-slate-500">
              Understand where your money goes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
                onClick={() => setRefresh((value) => value + 1)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
                <RefreshCw size={17} />
                Refresh
            </button>

            <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
                <Plus size={17} />
                Add expense
            </button>


            <Link
                to="/groups"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 px-4 py-3 text-sm font-semibold  text-white shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                <Users className="h-4 w-4" />
                Groups
            </Link>

            </div>


            

        </section>




        {error && (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <p className="text-sm text-slate-500">
            Loading your expenses...
          </p>
        )}

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-6 text-white shadow-lg shadow-violet-200/50">
            <Wallet className="mb-5 opacity-80" size={25} />
            <p className="text-sm text-violet-100">Total Spent</p>
            <h3 className="mt-2 text-3xl font-bold">
              {money(totalSpent)}
            </h3>
            <p className="mt-3 text-xs text-violet-100">
              {monthName}
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg shadow-emerald-200/50">
            <Receipt className="mb-5 opacity-80" size={25} />
            <p className="text-sm text-emerald-100">
              Transactions
            </p>
            <h3 className="mt-2 text-3xl font-bold">
              {monthlyExpenses.length}
            </h3>
            <p className="mt-3 text-xs text-emerald-100">
              Expenses recorded this month
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 p-6 text-white shadow-lg shadow-orange-200/50">
            <TrendingUp className="mb-5 opacity-80" size={25} />
            <p className="text-sm text-orange-100">
              Daily Average
            </p>
            <h3 className="mt-2 text-3xl font-bold">
              {money(dailyAverage)}
            </h3>
            <p className="mt-3 text-xs text-orange-100">
              Average across calendar days
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-600 p-6 text-white shadow-lg shadow-pink-200/50">
            <CalendarDays className="mb-5 opacity-80" size={25} />
            <p className="text-sm text-pink-100">
              Top Spending Category
            </p>
            <h3 className="mt-2 truncate text-2xl font-bold">
              {topCategory}
            </h3>
            <p className="mt-3 text-xs text-pink-100">
              Highest spending this month
            </p>
          </div>

        </section>

        {/* CHARTS */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* DAILY SPENDING CHART */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">

            <div className="mb-6">
              <h3 className="text-lg font-bold">
                Spending Trends
              </h3>
              <p className="text-sm text-slate-500">
                Daily expenses for {monthName}
              </p>
            </div>

            <div className="h-72 w-full">
              {monthlyExpenses.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient
                        id="spendingGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8B5CF6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />

                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                      width={55}
                    />

                    <Tooltip
                      formatter={(value) => money(Number(value))}
                      labelFormatter={(day) => `Day ${day}`}
                    />

                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Expenses"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      fill="url(#spendingGradient)"
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No spending data for this month.
                </div>
              )}
            </div>

          </div>

          {/* CATEGORY PIE CHART */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

            <h3 className="text-lg font-bold">
              Spending by Category
            </h3>

            <p className="text-sm text-slate-500">
              Where your money went
            </p>

            {categoryData.length > 0 ? (
              <>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={87}
                        paddingAngle={3}
                      >
                        {categoryData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value) => money(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {categoryData.map((category) => (
                    <button
                      key={category.name}
                      onClick={() =>
                        setCategoryFilter(
                          categoryFilter === category.name
                            ? "All"
                            : category.name
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50 ${
                        categoryFilter === category.name
                          ? "bg-violet-50 ring-1 ring-violet-200"
                          : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: category.color,
                          }}
                        />
                        {category.name}
                      </span>

                      <span className="font-semibold">
                        {money(category.value)}
                      </span>
                    </button>
                  ))}
                </div>

                {categoryFilter !== "All" && (
                  <button
                    onClick={() => setCategoryFilter("All")}
                    className="mt-4 text-sm font-medium text-violet-600 hover:underline"
                  >
                    Clear category filter
                  </button>
                )}
              </>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                No category data yet.
              </div>
            )}

          </div>

        </section>

        {/* EXPENSE CALENDAR */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <CalendarDays
                    size={21}
                    className="text-violet-600"
                  />
                  Expense Calendar
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select a date to view transactions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                  className="rounded-lg border p-2 hover:bg-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="min-w-28 text-center text-sm font-bold">
                  {monthName}
                </span>

                <button
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                  className="rounded-lg border p-2 hover:bg-slate-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">

              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day) => (
                  <div
                    key={day}
                    className="pb-3 text-xs font-semibold text-slate-400"
                  >
                    {day}
                  </div>
                )
              )}

              {calendarCells.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} />;
                }

                const selected = day.date === selectedDate;

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    aria-pressed={selected}
                    aria-label={`${day.date}, ${money(day.total)} spent`}
                    className={`
                      flex min-h-16 flex-col items-center justify-center
                      rounded-xl p-1 text-center transition
                      sm:min-h-20 sm:p-2
                      ${getDayColor(day.total)}
                      ${
                        selected
                          ? "ring-2 ring-violet-600 ring-offset-2"
                          : ""
                      }
                    `}
                  >
                    <span className="text-sm font-bold">
                      {day.day}
                    </span>

                    {day.total > 0 && (
                      <span className="mt-1 break-all text-[10px] font-semibold sm:text-xs">
                        {money(day.total)}
                      </span>
                    )}
                  </button>
                );
              })}

            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>Spending intensity:</span>

              {[
                ["Low", "bg-sky-100"],
                ["Medium", "bg-emerald-200"],
                ["High", "bg-orange-200"],
                ["Very high", "bg-purple-200"],
              ].map(([label, color]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${color}`} />
                  {label}
                </span>
              ))}
            </div>

          </div>

          {/* SELECTED DATE TRANSACTIONS */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">

            <h3 className="text-lg font-bold">
              Daily Transactions
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {selectedDateLabel}
            </p>

            <div className="my-5 rounded-xl bg-violet-50 p-4">
              <p className="text-xs font-medium text-violet-600">
                Total spent
              </p>

              <p className="mt-1 text-3xl font-bold text-violet-700">
                {money(selectedTotal)}
              </p>
            </div>

            <div className="space-y-3">

              {selectedExpenses.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-6 text-center">
                  <CalendarDays
                    className="mx-auto mb-3 text-slate-300"
                    size={30}
                  />

                  <p className="text-sm text-slate-500">
                    No matching expenses for this date.
                  </p>
                </div>
              ) : (

                selectedExpenses.map((expense) => (
                    <button
                        type="button"
                        key={`${expense.id}-${expense.is_group ? "g" : "p"}`}
                        onClick={() => setDetailExpense(expense)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50/40"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                        <span
                            className="h-10 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: getColor(expense.category) }}
                        />

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                            {expense.description}
                            {expense.is_group && (
                                <Star
                                    size={13}
                                    className="ml-1.5 inline-block fill-orange-500 text-orange-500"
                                    aria-label="Group expense"
                                />
                            )}
                            </p>

                            <p className="text-xs text-slate-500">{expense.category}</p>
                        </div>
                        </div>

                        <span className="shrink-0 text-sm font-bold">
                        {money(expense.amount)}
                        </span>
                    </button>
                    ))
              )}

            </div>

          </div>

        </section>

      </main>

      {showForm && (
        <AddExpenseForm
            categories={categories}
            defaultDate={selectedDate}
            onClose={() => setShowForm(false)}
            onAdded={() => setRefresh((value) => value + 1)}
        />
        )}

        {detailExpense && (
            <ExpenseDetail
                expense={detailExpense}
                onClose={() => setDetailExpense(null)}
            />
        )}
    </div>
  );
}
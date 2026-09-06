import { useState, useEffect, useCallback } from "react";
import { fetchExpenses, getExpenseSummary, deleteExpense } from "../services/financeApi";
import NeuCard from "../components/ui/NeuCard";
import NeuInput from "../components/ui/NeuInput";
import NeuSelect from "../components/ui/NeuSelect";
import NeuButton from "../components/ui/NeuButton";

const CATEGORIES = ["Transport", "Salary", "Utilities", "Maintenance", "Raw Materials", "Office", "Rent", "Other"];
const ROLES = ["Finance Manager", "Finance Officer", "Logistics Lead", "Maintenance Supervisor", "Staff"];

const emptyFilters = {
  month: "",
  year: "",
  category: "",
  createdByRole: "",
  startDate: "",
  endDate: "",
  search: "",
};

const ExpensesPage = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildParams = () => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined) params[k] = v;
    });
    return params;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams();
      const [expRes, sumRes] = await Promise.all([
        fetchExpenses(params),
        getExpenseSummary(params),
      ]);
      setExpenses(expRes.data.data || []);
      setSummary(sumRes.data.data || null);
    } catch (err) {
      console.error("Load expenses error:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => setFilters(emptyFilters);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      load();
    } catch (err) {
      console.error("Delete expense error:", err);
      setError("Failed to delete expense");
    }
  };

  return (
    <div className="space-y-6">
      <NeuCard>
        <h2 className="text-xl font-bold text-neuPrimary mb-4">Expense Cycle Filtering</h2>

        {error && (
          <div className="neu-inset px-4 py-3 mb-4 text-red-400 text-sm font-medium">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <NeuInput
            name="month"
            type="number"
            value={filters.month}
            onChange={handleChange}
            placeholder="Month (1-12)"
          />
          <NeuInput
            name="year"
            type="number"
            value={filters.year}
            onChange={handleChange}
            placeholder="Year"
          />
          <NeuSelect name="category" value={filters.category} onChange={handleChange}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </NeuSelect>
          <NeuSelect name="createdByRole" value={filters.createdByRole} onChange={handleChange}>
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </NeuSelect>
          <NeuInput
            name="startDate"
            type="date"
            value={filters.startDate}
            onChange={handleChange}
            placeholder="Start date"
          />
          <NeuInput
            name="endDate"
            type="date"
            value={filters.endDate}
            onChange={handleChange}
            placeholder="End date"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="flex-1">
            <NeuInput
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search title / description / notes"
            />
          </div>
          <NeuButton onClick={load}>Apply Filters</NeuButton>
          <NeuButton onClick={handleReset} className="!bg-transparent">Reset</NeuButton>
        </div>
      </NeuCard>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NeuCard className="p-5">
            <p className="text-sm text-neuTextMuted">Total (filtered)</p>
            <p className="text-2xl font-bold text-neuPrimary mt-1">
              {summary.totalAmount?.toLocaleString()} {summary.currency}
            </p>
          </NeuCard>
          <NeuCard className="p-5">
            <p className="text-sm text-neuTextMuted">Count</p>
            <p className="text-2xl font-bold text-neuTextDark mt-1">{summary.count}</p>
          </NeuCard>
          <NeuCard className="p-5">
            <p className="text-sm text-neuTextMuted">Average</p>
            <p className="text-2xl font-bold text-neuTextDark mt-1">
              {summary.averageAmount?.toLocaleString()} {summary.currency}
            </p>
          </NeuCard>
        </div>
      )}

      <NeuCard>
        <h3 className="text-lg font-semibold text-neuPrimary mb-4">Expenses</h3>
        {loading ? (
          <p className="text-neuTextMuted text-sm">Loading...</p>
        ) : expenses.length === 0 ? (
          <p className="text-neuTextMuted text-sm">No expenses match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neuTextMuted border-b border-neuBorder">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e._id} className="border-b border-neuBorder/50">
                    <td className="py-2 pr-4 text-neuTextMuted">
                      {new Date(e.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4 text-neuTextDark font-medium">{e.title}</td>
                    <td className="py-2 pr-4">{e.category}</td>
                    <td className="py-2 pr-4 text-neuTextMuted">{e.createdByRole}</td>
                    <td className="py-2 pr-4 font-semibold text-neuPrimary">
                      {e.amount?.toLocaleString()} {e.currency}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        onClick={() => handleDelete(e._id)}
                        className="text-neuDanger text-xs font-semibold hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeuCard>
    </div>
  );
};

export default ExpensesPage;
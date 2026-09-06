import { useState } from "react";
import { createExpense } from "../services/financeApi";
import NeuCard from "../components/ui/NeuCard";
import NeuInput from "../components/ui/NeuInput";
import NeuSelect from "../components/ui/NeuSelect";
import NeuButton from "../components/ui/NeuButton";

const CATEGORIES = ["Transport", "Salary", "Utilities", "Maintenance", "Raw Materials", "Office", "Rent", "Other"];

const initialForm = {
  title: "",
  amount: "",
  category: "",
  description: "",
  expenseDate: new Date().toISOString().split("T")[0],
};

const TitleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
  </svg>
);

const AmountIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" />
  </svg>
);

const TagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41 12 22l-9-9V4a1 1 0 011-1h9l7.59 7.59a2 2 0 010 2.82z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

const DateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
  </svg>
);

const ReceiptIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 2h12a1 1 0 011 1v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5L3 21V3a1 1 0 011-1z" strokeLinejoin="round" />
    <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
  </svg>
);

const ExpenseCreatePage = () => {
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg("");

    // basic client‑side guard
    if (!formData.title || !formData.amount || !formData.category) {
      setError("Please fill Title, Amount and Category.");
      setLoading(false);
      return;
    }
    if (Number(formData.amount) <= 0) {
      setError("Amount must be greater than zero.");
      setLoading(false);
      return;
    }

    try {
      const payload = { ...formData, amount: Number(formData.amount) };
      await createExpense(payload);
      setSuccessMsg("Expense created successfully!");
      setFormData(initialForm);
    } catch (err) {
      console.error("CREATE EXPENSE ERROR:", err);
      const backendMsg = err.response?.data?.message;
      setError(backendMsg || "Failed to create expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <NeuCard className="p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="neu-capsule w-16 h-16 flex items-center justify-center text-neuPrimary mb-4">
            <ReceiptIcon />
          </div>
          <h2 className="text-2xl font-bold text-neuTextDark">New Expense</h2>
          <p className="text-sm text-neuTextMuted mt-1 text-center">
            Log a company expense for tracking and reporting
          </p>
        </div>

        {error && (
          <div className="neu-inset-soft px-5 py-3 mb-5 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="neu-inset-soft px-5 py-3 mb-5 text-neuPrimary text-sm font-medium text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <NeuInput
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Expense title"
            icon={<TitleIcon />}
          />
          <NeuInput
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Amount (BDT)"
            icon={<AmountIcon />}
          />
          <NeuSelect
            name="category"
            value={formData.category}
            onChange={handleChange}
            icon={<TagIcon />}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </NeuSelect>
          <NeuInput
            name="expenseDate"
            type="date"
            value={formData.expenseDate}
            onChange={handleChange}
            icon={<DateIcon />}
          />

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="neu-inset-soft w-full px-6 py-4 outline-none bg-transparent min-h-[80px] placeholder:text-neuTextMuted/70 focus:ring-2 focus:ring-neuMint/60 transition-all"
            placeholder="Optional notes"
          />

          <NeuButton type="submit" disabled={loading} className="w-full !mt-6">
            {loading ? "Submitting..." : "Create Expense"}
          </NeuButton>
        </form>
      </NeuCard>
    </div>
  );
};

export default ExpenseCreatePage;

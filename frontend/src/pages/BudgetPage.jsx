import { useState, useEffect } from "react";
import { getBudgets, createBudget, updateBudget } from "../services/financeApi";
import NeuCard from "../components/ui/NeuCard";
import NeuInput from "../components/ui/NeuInput";
import NeuButton from "../components/ui/NeuButton";

// inline svg icons
const BudgetNameIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const AmountIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 6v12"></path>
    <path d="M16 9H9.5a2.5 2.5 0 0 0 0 5H15"></path>
  </svg>
);

const BudgetPage = () => {
  const [budgetId, setBudgetId] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetName, setBudgetName] = useState("Monthly Budget");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const loadBudget = async () => {
      setPageLoading(true);
      try {
        const res = await getBudgets();
        const existing = (res.data.data || [])[0];
        if (existing) {
          setBudgetId(existing._id);
          setBudgetName(existing.name);
          setBudgetAmount(String(existing.monthlyAmount));
        }
      } catch (err) {
        setError("Failed to load budget data");
        console.error("Load budget error:", err);
      } finally {
        setPageLoading(false);
      }
    };
    loadBudget();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!budgetAmount || Number(budgetAmount) <= 0) {
      setError("Monthly budget amount must be greater than zero");
      return;
    }

    const payload = {
      name: budgetName,
      currency: "BDT",
      category: "Other",
      dueDay: 1,
      startDate: new Date().toISOString(),
      monthlyAmount: Number(budgetAmount),
    };

    setLoading(true);
    setError(null);
    setSuccessMsg("");
    try {
      if (budgetId) {
        await updateBudget(budgetId, payload);
      } else {
        const createRes = await createBudget(payload);
        setBudgetId(createRes.data.data._id);
      }
      setSuccessMsg("Budget saved successfully!");
    } catch (err) {
      console.error("Save budget error:", err);
      setError("Could not save budget. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-sm mx-auto py-8">
        <NeuCard className="p-8 text-center text-neuTextMuted">
          Loading budget data...
        </NeuCard>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <NeuCard className="p-8">
        <h2 className="text-xl font-bold text-neuPrimary mb-6">
          Monthly Budget Management
        </h2>

        {error && (
          <div className="neu-inset px-4 py-3 mb-4 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="neu-inset px-4 py-3 mb-4 text-neuPrimary text-sm font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-neuTextMuted">Budget Name</label>
            <div className="mt-1">
              <NeuInput
                icon={<BudgetNameIcon />}
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="Budget name"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neuTextMuted">
              Monthly Budget (BDT)
            </label>
            <div className="mt-1">
              <NeuInput
                icon={<AmountIcon />}
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Enter monthly budget amount"
              />
            </div>
          </div>

          <NeuButton className="w-full !mt-6" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save / Update Budget"}
          </NeuButton>
        </form>
      </NeuCard>
    </div>
  );
};

export default BudgetPage;

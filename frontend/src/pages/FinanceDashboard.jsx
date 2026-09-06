import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { getFinanceDashboard } from "../services/financeApi";
import NeuCard from "../components/ui/NeuCard";
import NeuStatCard from "../components/ui/NeuStatCard";

// Quick‑action icons
const AddExpenseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const BudgetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
    <line x1="2" y1="10" x2="22" y2="10"></line>
  </svg>
);

const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const FinanceDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await getFinanceDashboard();
        setDashboardData(res.data.data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <NeuCard className="text-neuTextMuted text-center py-10">
        Loading dashboard...
      </NeuCard>
    );
  }

  if (error) {
    return (
      <NeuCard className="text-center py-10">
        <p className="text-red-600 font-medium">{error}</p>
      </NeuCard>
    );
  }

  if (!dashboardData) return null;

  const remaining = dashboardData.monthlyBudget - dashboardData.monthlyExpense;

  const actionItems = [
  {
    label: "Add Expense",
    route: "/finance/expenses/create",   // was "/expenses/create"
    description: "Log new company expense entries",
    icon: <AddExpenseIcon />
  },
  {
    label: "Manage Budget",
    route: "/finance/budget",            // was "/budget"
    description: "Set and update your monthly budget",
    icon: <BudgetIcon />
  },
  {
    label: "Expense History",
    route: "/finance/expenses",          // see note below — page doesn't exist yet
    description: "View & filter all past expenses",
    icon: <HistoryIcon />
  },
  {
    label: "Settings",
    route: "/finance/settings",          // was "/settings"
    description: "App and account configuration",
    icon: <SettingsIcon />
  }
];

  return (
    <div className="space-y-8">
      {/* Stat Cards Section — original unchanged */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NeuStatCard
          label="Monthly Budget"
          value={`${dashboardData.monthlyBudget?.toLocaleString()} ${dashboardData.displayCurrency || "BDT"}`}
        />
        <NeuStatCard
          label="Monthly Expense"
          value={`${dashboardData.monthlyExpense?.toLocaleString()} ${dashboardData.displayCurrency || "BDT"}`}
        />
        <NeuStatCard
          label="Remaining"
          value={`${remaining.toLocaleString()} ${dashboardData.displayCurrency || "BDT"}`}
          accent
        />
        <NeuStatCard
          label="Overdue Payable"
          value={`${dashboardData.overduePayable?.toLocaleString()} ${dashboardData.displayCurrency || "BDT"}`}
        />
      </div>

      {/* Recent Expenses — original unchanged */}
      <NeuCard>
        <h3 className="text-lg font-semibold text-neuPrimary mb-4">
          Recent Expenses
        </h3>
        <div className="space-y-2">
          {dashboardData.recentExpenses?.length === 0 && (
            <p className="text-neuTextMuted text-sm">No expenses recorded yet.</p>
          )}
          {dashboardData.recentExpenses?.map((item, idx) => (
            <div
              key={idx}
              className="neu-inset px-4 py-3 flex justify-between items-center"
            >
              <span className="text-neuTextDark font-medium">{item.title}</span>
              <span className="text-neuPrimary font-semibold">
                {item.amount?.toLocaleString()} {item.currency}
              </span>
            </div>
          ))}
        </div>
      </NeuCard>

      {/* Upcoming Payments — original unchanged */}
      <NeuCard>
        <h3 className="text-lg font-semibold text-neuPrimary mb-4">
          Upcoming Payments
        </h3>
        <div className="space-y-2">
          {dashboardData.upcomingPayments?.length === 0 && (
            <p className="text-neuTextMuted text-sm">Nothing due right now.</p>
          )}
          {dashboardData.upcomingPayments?.map((p) => (
            <div
              key={p.id}
              className="neu-inset px-4 py-3 flex justify-between items-center"
            >
              <div>
                <p className="text-neuTextDark font-medium">{p.supplierName}</p>
                <p className="text-xs text-neuTextMuted">{p.invoiceNumber}</p>
              </div>
              <span className="text-neuPrimary font-semibold">
                {p.outstandingAmount?.toLocaleString()} {p.currency}
              </span>
            </div>
          ))}
        </div>
      </NeuCard>

      {/* Quick‑Actions with icons */}
      <div>
        <h4 className="text-lg font-semibold text-neuTextDark mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {actionItems.map((item) => (
            <NavLink to={item.route} key={item.route}>
              <NeuCard className="p-6 cursor-pointer hover:scale-[1.02] transition-transform duration-200 h-full">
                <div className="flex items-start gap-4">
                  <div className="text-neuPrimary">
                    {item.icon}
                  </div>
                  <div>
                    <h5 className="text-base font-semibold text-neuTextDark mb-1">{item.label}</h5>
                    <p className="text-sm text-neuTextMuted">{item.description}</p>
                  </div>
                </div>
              </NeuCard>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;

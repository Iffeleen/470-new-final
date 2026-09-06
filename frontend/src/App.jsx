import {BrowserRouter as Router, Routes, Route} from "react-router-dom"
import NeuCard from "./components/ui/NeuCard";
import NeuNavbar from "./components/ui/NeuNavbar";
import ExpenseCreatePage from "./pages/ExpenseCreatePage";
import ExpensesPage from "./pages/ExpensesPage";
import BudgetPage from "./pages/BudgetPage";
import PayablesPage from "./pages/PayablesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import FinanceDashboard from "./pages/FinanceDashboard";
import CurrencySettingsPage from "./pages/CurrencySettingsPage";

function App() {
  return (
    <Router>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <NeuCard className="mb-6">
          <h1 className="text-lg md:text-xl font-bold text-neuPrimary">
            Inventory & Finance Management System
          </h1>
        </NeuCard>
        <NeuNavbar />
        <Routes>
          <Route path="/" element={<FinanceDashboard />}/>
          <Route path="/finance/budget" element={<BudgetPage />} />
          <Route path="/finance/expenses" element={<ExpensesPage />} />
          <Route path="/finance/expenses/create" element={<ExpenseCreatePage />} />
          <Route path="/finance/payables" element={<PayablesPage />} />
          <Route path="/finance/analytics" element={<AnalyticsPage />} />
          <Route path="/finance/settings" element={<CurrencySettingsPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
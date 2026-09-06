import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { getSpendingTrend, getCategoryBreakdown, getConsumptionTrend } from "../services/financeApi";
import NeuCard from "../components/ui/NeuCard";

const PIE_COLORS = ["#34d399", "#6ee7b7", "#10b981", "#f87171", "#fbbf24", "#60a5fa", "#a78bfa", "#f472b6"];

const AnalyticsPage = () => {
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [consumptionTrend, setConsumptionTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendRes, catRes, consRes] = await Promise.all([
        getSpendingTrend(),
        getCategoryBreakdown(),
        getConsumptionTrend(),
      ]);
      setSpendingTrend(trendRes.data.data || []);
      setCategoryBreakdown(catRes.data.data || []);
      setConsumptionTrend(consRes.data.data || []);
    } catch (err) {
      console.error("Load analytics error:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // group consumption by period for a simple line chart (sum of totalCost per period)
  const consumptionByPeriod = Object.values(
    consumptionTrend.reduce((acc, item) => {
      if (!acc[item.period]) acc[item.period] = { period: item.period, totalCost: 0 };
      acc[item.period].totalCost += item.totalCost;
      return acc;
    }, {})
  ).sort((a, b) => (a.period > b.period ? 1 : -1));

  if (loading) {
    return <NeuCard className="text-center py-10 text-neuTextMuted">Loading analytics...</NeuCard>;
  }
  if (error) {
    return <NeuCard className="text-center py-10 text-neuDanger">{error}</NeuCard>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-neuPrimary">Visual Consumption & Spending Trends</h2>

      <NeuCard>
        <h3 className="text-lg font-semibold text-neuTextDark mb-4">Spending Trend (by period)</h3>
        {spendingTrend.length === 0 ? (
          <p className="text-neuTextMuted text-sm">No expense data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={spendingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="period" stroke="#8b968f" fontSize={12} />
              <YAxis stroke="#8b968f" fontSize={12} />
              <Tooltip contentStyle={{ background: "#141b18", border: "1px solid #ffffff20" }} />
              <Legend />
              <Line type="monotone" dataKey="totalAmount" name={`Amount (${spendingTrend[0]?.currency || "BDT"})`} stroke="#34d399" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </NeuCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeuCard>
          <h3 className="text-lg font-semibold text-neuTextDark mb-4">Expense Category Breakdown</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-neuTextMuted text-sm">No expense data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="totalAmount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.category} (${entry.percentage}%)`}
                >
                  {categoryBreakdown.map((entry, idx) => (
                    <Cell key={entry.category} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#141b18", border: "1px solid #ffffff20" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </NeuCard>

        <NeuCard>
          <h3 className="text-lg font-semibold text-neuTextDark mb-4">Material Consumption Trend</h3>
          {consumptionByPeriod.length === 0 ? (
            <p className="text-neuTextMuted text-sm">No consumption data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consumptionByPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="period" stroke="#8b968f" fontSize={12} />
                <YAxis stroke="#8b968f" fontSize={12} />
                <Tooltip contentStyle={{ background: "#141b18", border: "1px solid #ffffff20" }} />
                <Bar dataKey="totalCost" name="Consumption Cost" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </NeuCard>
      </div>
    </div>
  );
};

export default AnalyticsPage;
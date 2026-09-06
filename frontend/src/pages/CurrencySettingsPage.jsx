import { useState, useEffect } from "react";
import { getCurrencySettings, updateCurrencySettings } from "../services/financeApi";
import NeuCard from "../components/ui/NeuCard";
import NeuInput from "../components/ui/NeuInput";
import NeuSelect from "../components/ui/NeuSelect";
import NeuButton from "../components/ui/NeuButton";

const SUPPORTED_CURRENCIES = ["BDT", "USD", "EUR", "GBP"];

const CurrencySettingsPage = () => {
  const [baseCurrency, setBaseCurrency] = useState("BDT");
  const [displayCurrency, setDisplayCurrency] = useState("BDT");
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setPageLoading(true);
      try {
        const res = await getCurrencySettings();
        const data = res.data.data;
        setBaseCurrency(data.baseCurrency);
        setDisplayCurrency(data.displayCurrency);
        setExchangeRates(data.exchangeRates || {});
      } catch (err) {
        console.error("Load currency settings error:", err);
        setError("Failed to load currency settings");
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, []);

  const handleRateChange = (code, value) => {
    setExchangeRates((prev) => ({ ...prev, [code]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg("");
    try {
      const cleanedRates = {};
      for (const code of SUPPORTED_CURRENCIES) {
        if (code === "BDT") continue; // BDT is fixed at 1.0, backend enforces this
        const num = Number(exchangeRates[code]);
        if (!isNaN(num) && num > 0) cleanedRates[code] = num;
      }

      await updateCurrencySettings({
        displayCurrency,
        exchangeRates: cleanedRates,
      });

      const res = await getCurrencySettings();
      const data = res.data.data;
      setDisplayCurrency(data.displayCurrency);
      setExchangeRates(data.exchangeRates || {});
      setSuccessMsg("Currency settings updated successfully!");
    } catch (err) {
      console.error("Save currency settings error:", err);
      setError("Could not save currency settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <NeuCard className="max-w-xl mx-auto text-center py-10 text-neuTextMuted">
        Loading currency settings...
      </NeuCard>
    );
  }

  return (
    <NeuCard className="max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-neuPrimary mb-6">Currency Settings</h2>

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
          <label className="text-sm font-medium text-neuTextMuted">Base Currency</label>
          <div className="mt-1">
            <NeuInput value={baseCurrency} onChange={() => {}} placeholder="Base currency" />
          </div>
          <p className="text-xs text-neuTextMuted mt-1">
            Base currency is fixed at account creation and can't be changed here.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-neuTextMuted">Display Currency</label>
          <div className="mt-1">
            <NeuSelect
              name="displayCurrency"
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </NeuSelect>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-neuTextMuted mb-2">
            Exchange Rates (relative to BDT = 1.0)
          </p>
          <div className="space-y-3">
            {SUPPORTED_CURRENCIES.filter((c) => c !== "BDT").map((code) => (
              <div key={code} className="flex items-center gap-3">
                <span className="w-14 text-neuTextDark font-medium">{code}</span>
                <NeuInput
                  name={`rate-${code}`}
                  type="number"
                  value={exchangeRates[code] ?? ""}
                  onChange={(e) => handleRateChange(code, e.target.value)}
                  placeholder={`Rate for ${code}`}
                />
              </div>
            ))}
          </div>
        </div>

        <NeuButton type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Currency Settings"}
        </NeuButton>
      </form>
    </NeuCard>
  );
};

export default CurrencySettingsPage;
export default function NeuStatCard({ label, value, sub, accent = false }) {
  return (
    <div className="neu-raised p-5">
      <p className="text-sm text-neuTextMuted font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-neuPrimary" : "text-neuTextDark"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-neuTextMuted mt-1">{sub}</p>}
    </div>
  );
}
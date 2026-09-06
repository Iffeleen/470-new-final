const VARIANTS = {
  paid: "bg-neuMint/40 text-neuPrimary",
  dueSoon: "bg-yellow-200/60 text-yellow-800",
  partial: "bg-orange-200/60 text-orange-800",
  overdue: "bg-red-200/60 text-red-700",
  neutral: "bg-neuBg text-neuTextMuted",
};

export default function NeuBadge({ children, variant = "neutral" }) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${VARIANTS[variant] || VARIANTS.neutral}`}
    >
      {children}
    </span>
  );
}
export default function NeuSelect({ name, value, onChange, children, icon = null, className = "" }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-neuTextMuted pointer-events-none">
          {icon}
        </span>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`neu-capsule w-full ${icon ? "pl-14" : "pl-6"} pr-10 py-4 outline-none bg-transparent text-neuTextDark appearance-none focus:ring-2 focus:ring-neuMint/60 transition-all ${className}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-neuTextMuted">▾</span>
    </div>
  );
}
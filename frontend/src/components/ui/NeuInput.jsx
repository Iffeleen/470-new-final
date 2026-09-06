// frontend/src/components/ui/NeuInput.jsx
export default function NeuInput({
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
  className = "",
}) {
  return (
    <div className="relative flex items-center">
      {icon && (
        <span className="pointer-events-none absolute left-5 flex items-center text-neuTextMuted">
          {icon}
        </span>
      )}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`neu-capsule w-full ${icon ? "pl-12" : "pl-6"} pr-6 py-4 outline-none bg-transparent text-neuTextDark placeholder:text-neuTextMuted/70 focus:ring-2 focus:ring-neuMint/60 transition-all ${className}`}
      />
    </div>
  );
}
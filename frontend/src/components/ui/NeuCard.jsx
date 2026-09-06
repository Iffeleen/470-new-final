export default function NeuCard({ children, className = "" }) {
  return (
    <div className={`neu-raised p-10 ${className}`}>
      {children}
    </div>
  );
}
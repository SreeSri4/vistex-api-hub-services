interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  label?: string;
}

export function SearchInput({ value, onChange, placeholder, className = "", label = "Search" }: SearchInputProps) {
  return (
    <div className={`relative max-w-sm ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      />
    </div>
  );
}
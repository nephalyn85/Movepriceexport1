interface SizeOption {
  value: string;
  label: string;
  volume: string;
}

interface SizeSelectorProps {
  options: SizeOption[];
  selected: string;
  onChange: (value: string) => void;
}

export default function SizeSelector({ options, selected, onChange }: SizeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center ${
            selected === option.value
              ? 'border-teal-500 bg-teal-50'
              : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span
            className={`block font-semibold text-sm ${
              selected === option.value ? 'text-teal-900' : 'text-slate-700'
            }`}
          >
            {option.label}
          </span>
          <span
            className={`block text-xs mt-1 ${
              selected === option.value ? 'text-teal-600' : 'text-slate-400'
            }`}
          >
            {option.volume}
          </span>
          {selected === option.value && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full border-2 border-white" />
          )}
        </button>
      ))}
    </div>
  );
}

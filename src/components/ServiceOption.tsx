import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ServiceOptionProps {
  icon: LucideIcon;
  name: string;
  label: string;
  description: string;
  price: number;
  priceMax?: number;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disclaimer?: string;
}

export default function ServiceOption({
  icon: Icon,
  name,
  label,
  description,
  price,
  priceMax,
  checked,
  onChange,
  disclaimer,
}: ServiceOptionProps) {
  return (
    <label
      className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
        checked
          ? 'border-teal-500 bg-teal-50'
          : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${
          checked ? 'bg-teal-600 text-white' : 'bg-white text-slate-400'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${checked ? 'text-teal-900' : 'text-slate-700'}`}>
            {label}
          </span>
          {checked && (
            <span className="text-sm font-bold text-teal-600">
              +${Number.isInteger(price) ? price : price.toFixed(2)}{priceMax ? `-$${priceMax}` : ''}
            </span>
          )}
        </div>
        <p className={`text-sm mt-0.5 ${checked ? 'text-teal-700' : 'text-slate-500'}`}>
          {description}
        </p>
        {disclaimer && (
          <p className={`text-xs mt-1 italic ${checked ? 'text-teal-600' : 'text-slate-400'}`}>
            {disclaimer}
          </p>
        )}
      </div>
      {checked && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center bg-teal-600">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </label>
  );
}

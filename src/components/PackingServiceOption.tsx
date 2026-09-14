import { Package, Check } from 'lucide-react';

interface PackingServiceOptionProps {
  boxCount: number;
  onChange: (boxCount: number) => void;
}

const boxOptions = [0, 10, 20, 30, 40, 50];
const pricePerTenBoxes = 150;

export default function PackingServiceOption({ boxCount, onChange }: PackingServiceOptionProps) {
  const isSelected = boxCount > 0;
  const totalPrice = (boxCount / 10) * pricePerTenBoxes;

  return (
    <div
      className={`relative rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? 'border-teal-500 bg-teal-50'
          : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${
            isSelected ? 'bg-teal-600 text-white' : 'bg-white text-slate-400'
          }`}
        >
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isSelected ? 'text-teal-900' : 'text-slate-700'}`}>
              Packing Service
            </span>
            {isSelected && (
              <span className="text-sm font-bold text-teal-600">
                +${totalPrice}
              </span>
            )}
          </div>
          <p className={`text-sm mt-0.5 ${isSelected ? 'text-teal-700' : 'text-slate-500'}`}>
            Professional packing for your belongings
          </p>
          <p className={`text-xs mt-1 italic ${isSelected ? 'text-teal-600' : 'text-slate-400'}`}>
            $150 per 10 boxes (avg. 10-15 boxes per 1BR)
          </p>
        </div>
        {isSelected && (
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center bg-teal-600">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {boxOptions.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onChange(count)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                boxCount === count
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600'
              }`}
            >
              {count === 0 ? 'None' : `${count} boxes`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

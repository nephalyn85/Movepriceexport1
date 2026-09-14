import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MoveDatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date, isBusy: boolean) => void;
}

export function isBusyDay(date: Date): boolean {
  const day = date.getDate();
  const month = date.getMonth();
  const isBusySeason = month >= 4 && month <= 7;
  if (!isBusySeason) return false;
  const isEndOfMonth = day >= 25;
  const isFirstOfMonth = day === 1;
  return isEndOfMonth || isFirstOfMonth;
}

export default function MoveDatePicker({ selectedDate, onChange }: MoveDatePickerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isEndOfMonthDay = (day: number) => {
    return day >= 25;
  };

  const isBusySeasonMonth = () => {
    const month = currentMonth.getMonth();
    return month >= 4 && month <= 7;
  };

  const isDayBusy = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return isBusyDay(date);
  };

  const handleDateClick = (day: number) => {
    if (isPast(day)) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange(date, isBusyDay(date));
  };

  const canGoPrev = () => {
    return currentMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-9" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const past = isPast(day);
    const selected = isSelected(day);
    const todayDay = isToday(day);
    const busy = isDayBusy(day);

    days.push(
      <button
        key={day}
        type="button"
        disabled={past}
        onClick={() => handleDateClick(day)}
        className={`h-9 w-9 rounded-lg text-sm font-medium transition-all duration-150 ${
          past
            ? 'text-slate-300 cursor-not-allowed'
            : selected
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
            : todayDay
            ? 'bg-slate-100 text-slate-900 hover:bg-teal-100'
            : busy
            ? 'text-red-600 hover:bg-red-50'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-4 h-4 text-teal-600" />
        </div>
        <span className="text-sm font-semibold text-slate-700">Preferred Move Date</span>
        {isBusySeasonMonth() && (
          <span className="ml-auto text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
            Busy Season
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev()}
          className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((name) => (
          <div key={name} className="h-8 flex items-center justify-center text-xs font-medium text-slate-400">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-medium text-red-600">Note:</span> Rates are higher on the 1st and 25th-31st during peak moving season (May - August) due to increased demand.
        </p>
      </div>
    </div>
  );
}

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, JournalEntry, MOOD_EMOJIS } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  tasks: Task[];
  entries: Record<string, JournalEntry>;
}

const formatDateToKey = (date: Date): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  selectedDate,
  onSelectDate,
  tasks,
  entries,
}) => {
  const [viewDate, setViewDate] = React.useState(new Date(selectedDate));

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysCount = daysInMonth(year, month);
    let startDay = firstDayOfMonth(year, month);
    
    const days = [];
    
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getDayData = (date: Date) => {
    const key = formatDateToKey(date);
    const entry = entries[key];
    
    const dayTasks = tasks.filter(t => {
       if (t.completed && t.completedAt === key) {
         return true;
       }
       if (!t.completed && t.dueDate === key) {
         return true;
       }
       // Also check for tasks without due date if the calendar day is today
       if (!t.completed && !t.dueDate && isSameDay(date, new Date())) {
         return true;
       }
       return false;
    });

    const completedCount = dayTasks.filter(t => t.completed && t.completedAt === key).length;
    const pendingCount = dayTasks.length - completedCount;
    
    return { entry, completedCount, pendingCount };
  };

  const days = generateCalendarDays();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-surface rounded-3xl p-6 h-full flex flex-col relative overflow-hidden border border-border shadow-md">
      
      <div className="flex items-center justify-between mb-6 z-10">
        <h2 className="text-xl font-extrabold text-text-main tracking-tight">
          {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-text-muted hover:text-task-blue transition-all active:scale-95">
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button onClick={handleNextMonth} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-text-muted hover:text-task-blue transition-all active:scale-95">
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-4 z-10">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-bold text-text-muted py-2 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 gap-2 auto-rows-fr z-10">
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, currentDate);
          const { entry, completedCount, pendingCount } = getDayData(date);
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={`
                relative p-2 rounded-xl flex flex-col items-center justify-between gap-1 transition-all duration-200 group text-sm
                ${isSelected 
                  ? 'bg-task-blue text-white shadow-lg shadow-task-blue/25 scale-105 z-20' 
                  : 'hover:bg-gray-100 hover:scale-105'
                }
              `}
            >
              <span className={`
                font-bold w-7 h-7 flex items-center justify-center rounded-full
                ${isSelected ? '' : isToday ? 'bg-task-blue-light text-task-blue' : 'text-text-main'}
              `}>
                {date.getDate()}
              </span>

              <div className="flex flex-col items-center justify-end h-8">
                {entry && entry.content && (
                  <div className="text-base" title={`心情: ${entry.mood}`}>
                    {MOOD_EMOJIS[entry.mood]}
                  </div>
                )}
                {(completedCount > 0 || pendingCount > 0) && (
                  <div className="flex justify-center gap-1 mt-1">
                     {pendingCount > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/50' : 'bg-amber-400'}`} title={`${pendingCount}个未完成`} />}
                     {completedCount > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} title={`${completedCount}个已完成`} />}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
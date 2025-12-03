import React, { useState, useEffect } from 'react';
import { JournalEntry, MoodType, MOOD_EMOJIS } from '../types';
import { BookOpen, Calendar, PenLine, Check } from 'lucide-react';

interface DiaryProps {
  selectedDate: Date;
  entries: Record<string, JournalEntry>;
  setEntries: React.Dispatch<React.SetStateAction<Record<string, JournalEntry>>>;
}

const formatDateKey = (date: Date): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const Diary: React.FC<DiaryProps> = ({ selectedDate, entries, setEntries }) => {
  const dateKey = formatDateKey(selectedDate);
  
  const originalEntry = entries[dateKey] || {
    id: dateKey,
    date: dateKey,
    content: '',
    mood: MoodType.NEUTRAL,
    updatedAt: Date.now(),
    tags: [],
    reminderEnabled: false,
    reminderTime: '20:00'
  };

  const [localEntry, setLocalEntry] = useState<JournalEntry>(originalEntry);
  const [isEditing, setIsEditing] = useState(!originalEntry.content);

  useEffect(() => {
    const key = formatDateKey(selectedDate);
    const currentEntry = entries[key] || {
        id: key,
        date: key,
        content: '',
        mood: MoodType.NEUTRAL,
        updatedAt: Date.now(),
        tags: [],
        reminderEnabled: false,
        reminderTime: '20:00'
    };
    setLocalEntry(currentEntry);
    setIsEditing(!currentEntry.content);
  }, [dateKey, entries, selectedDate]);

  const handleConfirm = () => {
    setEntries(prev => ({
        ...prev,
        [dateKey]: { ...localEntry, id: dateKey, date: dateKey, updatedAt: Date.now() }
    }));
    setIsEditing(false);
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };

  const displayDate = selectedDate.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="bg-surface rounded-3xl p-6 h-full flex flex-col relative overflow-hidden border border-border shadow-md">
      
      <div className="flex items-center justify-between mb-6 z-10">
        <h2 className="text-xl font-extrabold text-text-main flex items-center gap-3 tracking-tight">
           <div className="bg-diary-pink-light text-diary-pink p-2.5 rounded-xl">
             <BookOpen className="w-5 h-5" strokeWidth={2.5} />
           </div>
          日记
        </h2>
        <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-text-muted bg-gray-100 border border-border px-3 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                {displayDate}
            </div>
             {isEditing ? (
                 <button onClick={handleConfirm} className="p-2.5 bg-diary-pink text-white rounded-xl shadow-md shadow-diary-pink/25 hover:shadow-lg transition-all active:scale-90">
                    <Check className="w-5 h-5" strokeWidth={3} />
                </button>
             ) : (
                <button onClick={handleEdit} className="p-2.5 bg-gray-100 text-text-muted rounded-xl hover:bg-gray-200 transition-all active:scale-95">
                    <PenLine className="w-5 h-5" strokeWidth={2.5} />
                </button>
             )}
        </div>
      </div>

      <div className="mb-6 z-10">
        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-3 ml-1">
          此刻心情
        </label>
        <div className={`flex justify-between bg-gray-50 p-2 rounded-2xl border border-border ${!isEditing ? 'pointer-events-none opacity-80' : ''}`}>
          {(Object.values(MoodType) as MoodType[]).map((m) => (
            <button
              key={m}
              onClick={() => setLocalEntry({...localEntry, mood: m})}
              disabled={!isEditing}
              className={`w-12 h-12 flex items-center justify-center rounded-xl text-3xl transition-all duration-300 ${
                localEntry.mood === m
                  ? 'bg-white shadow-md scale-110 ring-2 ring-diary-pink/50'
                  : 'hover:bg-white/50 hover:scale-105 opacity-60 hover:opacity-100'
              }`}
            >
              {MOOD_EMOJIS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col z-10 relative">
        <textarea
          value={localEntry.content}
          onChange={(e) => setLocalEntry({...localEntry, content: e.target.value})}
          readOnly={!isEditing}
          placeholder={isEditing ? "亲爱的日记，今天..." : "今天还没有写日记哦"}
          className={`flex-1 w-full p-4 rounded-2xl bg-gray-50 border border-border resize-none text-text-main placeholder-text-muted transition-all outline-none leading-relaxed text-base font-medium selection:bg-diary-pink/20 shadow-inner-sm ${isEditing ? 'focus:bg-white focus:border-diary-pink focus:ring-2 focus:ring-diary-pink/20' : 'cursor-default'}`}
        />
        <div className="absolute bottom-3 right-3 text-xs font-bold text-text-muted bg-white/80 px-2.5 py-1 rounded-full backdrop-blur-sm border border-border">
          {localEntry.content.length} 字
        </div>
      </div>
    </div>
  );
};
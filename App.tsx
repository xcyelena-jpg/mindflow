import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TodoList } from './components/TodoList';
import { Diary } from './components/Diary';
import { AnalysisPanel } from './components/AnalysisPanel';
import { CalendarView } from './components/CalendarView';
import { Task, JournalEntry, Tag, TAG_COLORS } from './types';
import { LayoutDashboard, Calendar as CalendarIcon, ListTodo, BookOpen, Sparkles } from 'lucide-react';

const formatDateToKey = (date: Date): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const App: React.FC = () => {
  // --- State Initialization ---
  
  const [view, setView] = useState<'dashboard' | 'calendar'>('dashboard');
  const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'diary'>('tasks');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const taskPageRef = useRef<HTMLDivElement>(null);
  const diaryPageRef = useRef<HTMLDivElement>(null);

  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('mindflow_tasks');
    if (!saved) return [];
    
    const parsedTasks: any[] = JSON.parse(saved);
    
    // Migration logic for old data format (timestamp to YYYY-MM-DD string)
    return parsedTasks.map(task => {
        const migratedTask = { ...task };
        if (typeof task.dueDate === 'number') {
            migratedTask.dueDate = formatDateToKey(new Date(task.dueDate));
        }
        if (typeof task.completedAt === 'number') {
            migratedTask.completedAt = formatDateToKey(new Date(task.completedAt));
        }
        return migratedTask as Task;
    });
  });

  const [entries, setEntries] = useState<Record<string, JournalEntry>>(() => {
    const saved = localStorage.getItem('mindflow_entries');
    if (saved) return JSON.parse(saved);
    const oldEntry = localStorage.getItem('mindflow_entry');
    if (oldEntry) {
      const parsed = JSON.parse(oldEntry);
      const todayKey = formatDateToKey(new Date());
      return { [todayKey]: { ...parsed, date: todayKey, id: todayKey, tags: [], reminderEnabled: false } };
    }
    return {};
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    const saved = localStorage.getItem('mindflow_tags');
    return saved ? JSON.parse(saved) : [
        { id: '1', name: '工作', color: TAG_COLORS[7] },
        { id: '2', name: '生活', color: TAG_COLORS[3] },
        { id: '3', name: '重要', color: TAG_COLORS[0] },
    ];
  });

  // --- Persistence ---
  useEffect(() => { localStorage.setItem('mindflow_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('mindflow_entries', JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem('mindflow_tags', JSON.stringify(tags)); }, [tags]);

  // --- Derived State & Helpers ---
  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const visibleTasksForAnalysis = useMemo(() => {
    const selectedKey = formatDateToKey(selectedDate);
    const todayKey = formatDateToKey(new Date());

    return tasks.filter(task => {
      const isCompletedOnDate = task.completed && task.completedAt === selectedKey;
      const isDueOnDate = !task.completed && task.dueDate === selectedKey;
      const isPendingNoDueDateOnSelectedToday = !task.completed && !task.dueDate && selectedKey === todayKey;
      return isCompletedOnDate || isDueOnDate || isPendingNoDueDateOnSelectedToday;
    });
  }, [tasks, selectedDate]);


  // --- Navigation Logic ---

  const handleTabClick = (tab: 'tasks' | 'diary') => {
    if (!swipeContainerRef.current) return;
    
    isProgrammaticScroll.current = true;
    setActiveMobileTab(tab);

    const container = swipeContainerRef.current;
    const width = container.offsetWidth;
    const left = tab === 'tasks' ? 0 : width;
    
    container.scrollTo({ left, behavior: 'smooth' });

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500); // Lock for slightly longer than typical smooth scroll
  };

  const handleScroll = () => {
    if (isProgrammaticScroll.current || !swipeContainerRef.current) return;

    const container = swipeContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth;
    
    const pageIndex = Math.round(scrollLeft / width);
    const newTab = pageIndex === 0 ? 'tasks' : 'diary';
    
    if (newTab !== activeMobileTab) {
      setActiveMobileTab(newTab);
    }
  };

  useEffect(() => {
    const targetRef = activeMobileTab === 'tasks' ? taskPageRef : diaryPageRef;
    if (targetRef.current) {
        targetRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeMobileTab]);

  // --- Notification Logic ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    
    const checkReminders = () => {
        if (Notification.permission !== "granted") return;
        const now = new Date();
        const currentTime = now.getTime();
        const currentHM = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
        const todayKey = formatDateToKey(now);

        tasks.forEach(task => {
            if (!task.completed && task.reminderTime) {
                const diff = Math.abs(currentTime - task.reminderTime);
                if (diff < 60000) { 
                     new Notification("心流笔记: 任务提醒", { body: task.text, icon: '/icon.png' });
                }
            }
        });

        const todayEntry = entries[todayKey];
        if (todayEntry?.reminderEnabled && todayEntry?.reminderTime === currentHM && (!todayEntry.content || todayEntry.content.length < 5)) {
             new Notification("心流笔记", { body: "是时候记录今天的日记了 📝" });
        }
    };

    const intervalId = setInterval(checkReminders, 60000); 
    return () => clearInterval(intervalId);
  }, [tasks, entries]);


  // --- Handlers ---
  const handleAddTag = (name: string) => {
      const newTag: Tag = {
          id: Date.now().toString(),
          name,
          color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      };
      setTags(prev => [...prev, newTag]);
      return newTag;
  };

  const getSelectedEntryContent = () => {
      const key = formatDateToKey(selectedDate);
      return entries[key]?.content || '';
  };

  const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      setView('dashboard');
      // Fix: For mobile, robustly set the tab to 'tasks' to prevent race conditions.
      if (window.innerWidth < 768) {
        // We set the state directly and then command the scroll.
        // This ensures the button color is correct immediately.
        setActiveMobileTab('tasks');
        if (swipeContainerRef.current) {
          swipeContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
      }
  };

  const isMobileDiaryView = view === 'dashboard' && activeMobileTab === 'diary';

  return (
    <div className="fixed inset-0 w-full h-[100dvh] font-sans text-text-main selection:bg-task-blue/20 flex flex-col md:relative md:h-screen md:overflow-auto overflow-hidden bg-background">
      
      <div className="flex-1 flex flex-col h-full md:max-w-7xl md:mx-auto w-full md:p-6 md:gap-6 overflow-hidden">
        
        <header className="shrink-0 px-4 py-4 md:p-0 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-300 md:bg-task-blue md:shadow-task-blue/20 ${isMobileDiaryView ? 'bg-diary-pink shadow-diary-pink/20' : 'bg-task-blue shadow-task-blue/20'}`}>
                <Sparkles className="text-white w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
            </div>
            <div>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tighter text-text-main">心流笔记</h1>
                <p className="hidden md:block text-xs text-text-muted font-bold tracking-wide uppercase">MindFlow</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200/50">
             <button
                onClick={() => setView('dashboard')}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 ${
                    view === 'dashboard' ? 'bg-white text-task-blue shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
             >
                <LayoutDashboard className="w-4 h-4" strokeWidth={2.5} />
                <span className="hidden md:inline">看板</span>
             </button>
             <button
                onClick={() => setView('calendar')}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-300 ${
                    view === 'calendar' ? 'bg-white text-task-blue shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
             >
                <CalendarIcon className="w-4 h-4" strokeWidth={2.5} />
                <span className="hidden md:inline">日历</span>
             </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
            {view === 'dashboard' ? (
                 <div className="hidden md:grid h-full grid-cols-12 gap-6 overflow-hidden">
                    <div className="col-span-4 h-full min-h-[400px]">
                        <TodoList 
                            tasks={tasks} 
                            setTasks={setTasks} 
                            selectedDate={selectedDate}
                            tags={tags}
                            onAddTag={handleAddTag}
                        />
                    </div>
                    <div className="col-span-4 h-full min-h-[400px]">
                        <Diary 
                            selectedDate={selectedDate}
                            entries={entries}
                            setEntries={setEntries}
                        />
                    </div>
                    <div className="col-span-4 h-full min-h-[300px]">
                        <AnalysisPanel tasks={visibleTasksForAnalysis} journalContent={getSelectedEntryContent()} />
                    </div>
                </div>
            ) : (
                <div className="hidden md:block h-full">
                     <CalendarView 
                        currentDate={new Date()}
                        selectedDate={selectedDate}
                        onSelectDate={handleDateSelect}
                        tasks={tasks}
                        entries={entries}
                     />
                </div>
            )}

            <div className="md:hidden flex-1 relative overflow-hidden">
                {view === 'calendar' ? (
                     <div className="h-full px-4 pt-2 pb-24 overflow-y-auto no-scrollbar">
                        <CalendarView 
                            currentDate={new Date()}
                            selectedDate={selectedDate}
                            onSelectDate={handleDateSelect}
                            tasks={tasks}
                            entries={entries}
                        />
                     </div>
                ) : (
                    <div 
                        ref={swipeContainerRef}
                        onScroll={handleScroll}
                        className="flex w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar scroll-smooth"
                    >
                        <div ref={taskPageRef} className="min-w-full w-full h-full snap-center overflow-y-auto pb-32 pt-2 px-4 no-scrollbar">
                            <div className="flex flex-col gap-6 min-h-full">
                                <div className="shrink-0">
                                    <TodoList 
                                        tasks={tasks} 
                                        setTasks={setTasks} 
                                        selectedDate={selectedDate}
                                        tags={tags}
                                        onAddTag={handleAddTag}
                                    />
                                </div>
                                <div className="shrink-0 pb-6">
                                    <AnalysisPanel tasks={visibleTasksForAnalysis} journalContent={getSelectedEntryContent()} />
                                </div>
                            </div>
                        </div>

                        <div ref={diaryPageRef} className="min-w-full w-full h-full snap-center overflow-y-auto pb-32 pt-2 px-4 no-scrollbar">
                            <div className="h-full min-h-[600px]">
                                <Diary 
                                    selectedDate={selectedDate}
                                    entries={entries}
                                    setEntries={setEntries}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </main>
      </div>

      {view === 'dashboard' && (
          <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm bg-white/70 backdrop-blur-xl border border-border rounded-full p-2 z-50 flex justify-between items-center h-16 shadow-lg">
            <button 
                onClick={() => handleTabClick('tasks')}
                className={`flex items-center justify-center gap-2 flex-1 h-full rounded-full transition-all duration-300 ${activeMobileTab === 'tasks' ? 'bg-task-blue text-white shadow-md shadow-task-blue/25' : 'text-text-muted hover:text-text-main'}`}
            >
                <ListTodo className="w-5 h-5" strokeWidth={activeMobileTab === 'tasks' ? 2 : 2.5} />
                {activeMobileTab === 'tasks' && <span className="text-sm font-bold animate-pop">今日</span>}
            </button>

            <button 
                onClick={() => handleTabClick('diary')}
                 className={`flex items-center justify-center gap-2 flex-1 h-full rounded-full transition-all duration-300 ${activeMobileTab === 'diary' ? 'bg-diary-pink text-white shadow-md shadow-diary-pink/25' : 'text-text-muted hover:text-text-main'}`}
            >
                <BookOpen className="w-5 h-5" strokeWidth={activeMobileTab === 'diary' ? 2 : 2.5} />
                {activeMobileTab === 'diary' && <span className="text-sm font-bold animate-pop">日记</span>}
            </button>
        </nav>
      )}
    </div>
  );
};

export default App;
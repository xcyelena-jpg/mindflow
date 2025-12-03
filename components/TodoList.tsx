import React, { useState, useRef, useEffect } from 'react';
import { Task, Tag } from '../types';
import { Plus, Trash2, Check, Sparkles, Loader2, Clock } from 'lucide-react';
import { breakDownTask } from '../services/geminiService';

interface TodoListProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  selectedDate: Date;
  tags: Tag[];
  onAddTag: (name: string) => Tag;
}

const formatDateToKey = (date: Date): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TodoList: React.FC<TodoListProps> = ({ tasks, setTasks, selectedDate, tags, onAddTag }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // --- Editing State ---
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // --- Swipe & Long Press Logic ---
  const longPressTimer = useRef<number | null>(null);
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const [swipingTaskId, setSwipingTaskId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };
  
  const addTask = (text: string) => {
    if (!text.trim()) return;
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
      priority: 'medium',
      // Only set a due date if the selected date is not today.
      dueDate: isToday(selectedDate) ? undefined : formatDateToKey(selectedDate),
      tags: [],
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? formatDateToKey(new Date()) : undefined } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleMagicBreakdown = async () => {
    if (!newTaskText.trim()) return;
    setIsBreakingDown(true);
    try {
      const subtasks = await breakDownTask(newTaskText);
      if (subtasks.length > 0) {
        const newTasks: Task[] = subtasks.map(st => ({
          id: Date.now().toString() + Math.random().toString(),
          text: st, completed: false, createdAt: Date.now(), priority: 'medium', tags: [],
          dueDate: isToday(selectedDate) ? undefined : formatDateToKey(selectedDate),
        }));
        setTasks(prev => [...newTasks, ...prev]);
        setNewTaskText('');
      } else {
        addTask(newTaskText);
      }
    } catch (e) {
      addTask(newTaskText);
    } finally {
      setIsBreakingDown(false);
    }
  };

  // --- Editing Logic ---
  const startEditing = (task: Task) => {
    if (task.completed) return;
    setEditingTaskId(task.id);
    setEditText(task.text);
  };
  
  const confirmEdit = () => {
    if (editingTaskId && editText.trim()) {
      setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, text: editText.trim() } : t));
    }
    setEditingTaskId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditText('');
  };
  
  // Auto-resize textarea
  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
        const textarea = editInputRef.current;
        textarea.style.height = 'auto'; // Reset height
        textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
    }
  }, [editText, editingTaskId]);
  
  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      const textarea = editInputRef.current;
      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    }
  }, [editingTaskId]);


  // --- Long Press & Swipe Logic ---
  const handleTouchStart = (task: Task, e: React.TouchEvent) => {
      if (editingTaskId) return;
      
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
      setSwipingTaskId(task.id);
      setSwipeOffset(0);

      // Start Long Press Timer
      handlePressEnd(); // Clear existing
      longPressTimer.current = window.setTimeout(() => {
          setTaskToDelete(task);
          if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStart.current || !swipingTaskId) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;

      // If moved significantly, cancel long press
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          handlePressEnd();
      }

      // Check if horizontal swipe dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          if (e.cancelable) e.preventDefault(); // Stop scrolling

          // Only allow right swipe (positive deltaX)
          if (deltaX > 0) {
              setSwipeOffset(Math.min(deltaX, 150)); // Cap at 150px
          } else {
              setSwipeOffset(0);
          }
      }
  };

  const handleTouchEnd = () => {
      handlePressEnd(); // Clear long press

      if (swipingTaskId) {
          // Threshold to trigger delete
          if (swipeOffset > 80) {
             const task = tasks.find(t => t.id === swipingTaskId);
             if (task) setTaskToDelete(task);
          }
          // Reset swipe
          setSwipeOffset(0);
          setSwipingTaskId(null);
      }
      touchStart.current = null;
  };

  // Mouse handlers for desktop long press (no swipe)
  const handleMouseDown = (task: Task, e: React.MouseEvent) => {
      if (editingTaskId || e.button !== 0) return;
      handlePressEnd();
      longPressTimer.current = window.setTimeout(() => {
          setTaskToDelete(task);
      }, 500);
  };

  const handlePressEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePressEnd();
  };
  
  const confirmDeleteTask = () => {
      if (taskToDelete) {
          deleteTask(taskToDelete.id);
          setTaskToDelete(null);
      }
  };

  const cancelDeleteTask = () => setTaskToDelete(null);

  const visibleTasks = tasks.filter(task => {
    const selectedKey = formatDateToKey(selectedDate);
    if (task.completed && task.completedAt) {
        return task.completedAt === selectedKey;
    }
    if (!task.completed) {
        if (task.dueDate) {
            return task.dueDate === selectedKey;
        }
        return isToday(selectedDate);
    }
    return false;
  });

  const sortedTasks = [...visibleTasks].sort((a, b) => (a.completed === b.completed) ? b.createdAt - a.createdAt : a.completed ? 1 : -1);
  const getTagById = (id: string) => tags.find(t => t.id === id);

  // Helper to sanitize text for display
  const getSanitizedTaskText = (text: string) => {
      if (text.startsWith('<') || text.includes('xml') || text.length > 50) {
          return text.length > 20 ? text.slice(0, 20) + '...' : '选中任务';
      }
      return text;
  };

  return (
    <div className="bg-surface rounded-3xl p-6 h-full flex flex-col relative overflow-hidden border border-border shadow-md">
      <div className="flex items-center justify-between mb-6 z-10">
        <h2 className="text-xl font-extrabold text-text-main flex items-center gap-3 tracking-tight">
          <div className="bg-task-blue-light text-task-blue p-2.5 rounded-xl">
             <Check className="w-5 h-5" strokeWidth={3} />
          </div>
          {isToday(selectedDate) ? '今日待办' : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`}
        </h2>
        <span className="bg-gray-100 text-text-muted text-xs font-bold px-3 py-1.5 rounded-full">
          {visibleTasks.filter(t => t.completed).length} / {visibleTasks.length}
        </span>
      </div>

      <div className="relative mb-6 z-10">
        <div className="relative group">
             <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask(newTaskText)} placeholder="添加一个小目标..." className="w-full pl-5 pr-28 py-4 rounded-2xl bg-gray-50 border border-border hover:border-gray-300 focus:bg-white focus:border-task-blue focus:ring-2 focus:ring-task-blue/20 text-text-main placeholder-text-muted transition-all outline-none font-semibold shadow-inner-sm" />
             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 z-10">
                <button onClick={handleMagicBreakdown} disabled={!newTaskText || isBreakingDown} className="p-2.5 text-task-blue hover:bg-task-blue-light rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:text-text-muted" title="AI 智能拆解">
                    {isBreakingDown ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" strokeWidth={2} />}
                </button>
                <button onClick={() => addTask(newTaskText)} disabled={!newTaskText} className="p-2.5 bg-task-blue text-white rounded-xl shadow-md shadow-task-blue/25 hover:shadow-lg hover:shadow-task-blue/30 transition-all active:scale-90 disabled:opacity-50 disabled:shadow-none disabled:bg-gray-200">
                    <Plus className="w-5 h-5" strokeWidth={3} />
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4 -mr-2 pr-2">
        {sortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-text-muted h-full py-10 opacity-75">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-border">
                <Sparkles className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="font-bold text-text-muted text-sm">今天还没有任务哦 ~</p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <div key={task.id} className="relative select-none">
              
              {/* Background Layer (Swipe Reveal) */}
              <div className="absolute inset-0 bg-danger-red rounded-2xl flex items-center justify-start pl-6 z-0">
                  <Trash2 className="w-5 h-5 text-white" />
                  <span className="text-white text-xs font-bold ml-2">松手删除</span>
              </div>

              {/* Foreground Layer (Task Card) */}
              <div 
                onMouseDown={(e) => handleMouseDown(task, e)}
                onTouchStart={(e) => handleTouchStart(task, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onDoubleClick={() => startEditing(task)}
                onContextMenu={handleContextMenu}
                style={{ 
                    transform: `translateX(${task.id === swipingTaskId ? swipeOffset : 0}px)`,
                    transition: task.id === swipingTaskId && swipeOffset !== 0 ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                className={`relative z-10 flex items-start gap-3 p-4 rounded-2xl border w-full cursor-pointer touch-pan-y ${
                  task.completed 
                    ? 'bg-gray-50 opacity-70 border-border' 
                    : 'bg-surface border-border shadow-sm'
                }`}
              >
                <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} className="mt-0.5 transition-all duration-300 transform shrink-0">
                  {task.completed ? (
                      <div className="w-6 h-6 bg-task-blue rounded-full flex items-center justify-center shadow-md shadow-task-blue/30 animate-pop">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </div>
                  ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-border hover:border-task-blue transition-colors bg-white" />
                  )}
                </button>
                <div className="flex-1 min-w-0 pt-0.5">
                   {editingTaskId === task.id ? (
                     <textarea
                        ref={editInputRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={confirmEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            confirmEdit();
                          }
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full font-semibold leading-tight bg-gray-50/50 border-none outline-none p-2 -m-2 rounded-lg resize-none focus:ring-2 focus:ring-task-blue/50 focus:bg-white transition-all"
                        rows={1}
                     />
                   ) : (
                     <span className={`font-semibold transition-all break-words leading-tight block ${task.completed ? 'text-text-muted line-through decoration-gray-300' : 'text-text-main'}`}>
                        {task.text}
                     </span>
                   )}
                   <div className="flex flex-wrap items-center gap-2 mt-2">
                      {task.reminderTime && <span className="text-[11px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-text-muted"><Clock className="w-3 h-3" strokeWidth={2.5} />{new Date(task.reminderTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                      {task.tags.map(tagId => { const t = getTagById(tagId); return t ? <span key={t.id} className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${t.color}`}>{t.name}</span> : null; })}
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {taskToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center animate-pop p-4" role="alertdialog" aria-modal="true" onContextMenu={(e)=>e.preventDefault()}>
            <div className="bg-surface rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-xs md:max-w-sm text-center">
                <h3 className="text-xl font-extrabold text-text-main mb-3">确认删除</h3>
                <p className="text-text-muted mb-6 text-sm">
                    确定要删除任务吗？此操作无法撤销。
                    <br />
                    <span className="inline-block mt-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-border text-text-main font-bold text-xs max-w-full truncate">
                       {getSanitizedTaskText(taskToDelete.text)}
                    </span>
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={cancelDeleteTask} className="w-full py-3.5 bg-gray-100 text-text-muted text-sm font-extrabold rounded-2xl hover:bg-gray-200 transition-colors">
                      取消
                    </button>
                    <button onClick={confirmDeleteTask} className="w-full py-3.5 bg-danger-red text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-red-500/25 hover:bg-red-600 transition-colors active:scale-95">
                      删除
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
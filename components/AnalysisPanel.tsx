import React, { useState } from 'react';
import { DailyAnalysis, Task } from '../types';
import { analyzeDailyContent } from '../services/geminiService';
import { BrainCircuit, TrendingUp, Lightbulb, Activity, RefreshCw, Sparkles, Wand2 } from 'lucide-react';

interface AnalysisPanelProps {
  tasks: Task[];
  journalContent: string;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ tasks, journalContent }) => {
  const [analysis, setAnalysis] = useState<DailyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeDailyContent(tasks, journalContent);
      setAnalysis(result);
    } catch (err: any) {
      // Display the specific error message (e.g., "Please configure API_KEY")
      setError(err.message || "分析失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };
  
  const canAnalyze = tasks.length > 0 || (journalContent && journalContent.trim().length > 0);

  if (!analysis && !loading && !error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-surface rounded-3xl border border-border shadow-md">
        <div className="w-20 h-20 bg-gradient-to-tr from-task-blue-light to-white rounded-3xl flex items-center justify-center shadow-sm mb-8 animate-float border border-white">
          <Wand2 className={`w-8 h-8 transition-colors ${canAnalyze ? 'text-task-blue' : 'text-gray-400'}`} strokeWidth={2} />
        </div>
        <h3 className="text-xl font-extrabold text-text-main mb-3 tracking-tight">
           {canAnalyze ? '准备好复盘今天了吗？' : '今日内容不足'}
        </h3>
        <p className="text-sm font-medium text-text-muted mb-10 max-w-xs leading-relaxed">
           {canAnalyze ? (
                <>让 AI 分析你的任务和心情，<br/>发现生活中的小确幸。</>
            ) : (
                <>完成今日任务或写下日记，<br/>即可解锁每日洞察。</>
            )}
        </p>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="px-8 py-3.5 bg-task-blue text-white text-sm font-bold rounded-xl shadow-lg shadow-task-blue/25 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 hover:shadow-task-blue/40 disabled:bg-gray-200 disabled:text-text-muted disabled:shadow-none disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          {canAnalyze ? '生成每日洞察' : '内容不足'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {loading ? (
        <div className="h-full flex items-center justify-center flex-col gap-5 bg-surface rounded-3xl border border-border shadow-md">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-task-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
           </div>
           <span className="text-sm font-bold text-text-muted">正在编织思维片段...</span>
        </div>
      ) : error ? (
        <div className="h-full flex items-center justify-center flex-col gap-4 bg-red-50 rounded-3xl border border-red-200 p-6 text-center shadow-md">
          <p className="text-red-600 font-bold text-sm px-4">{error}</p>
          <button onClick={handleAnalyze} className="text-sm font-bold text-red-600/70 underline hover:text-red-600">重试一下</button>
          {error.includes("API_KEY") && (
             <p className="text-xs text-text-muted mt-2">请在 Vercel 后台配置 API Key</p>
          )}
        </div>
      ) : analysis ? (
        <div className="h-full bg-surface rounded-3xl p-6 flex flex-col gap-5 overflow-y-auto no-scrollbar border border-border shadow-md">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-task-blue" />
              每日洞察
            </h2>
            <button onClick={handleAnalyze} className="p-2 bg-gray-100 rounded-lg text-text-muted hover:text-task-blue hover:bg-task-blue-light transition-colors">
              <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="p-6 bg-gradient-to-br from-task-blue to-blue-700 rounded-2xl shadow-lg shadow-task-blue/20 text-white relative overflow-hidden group shrink-0">
             <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full transition-transform group-hover:scale-110 duration-700 blur-xl"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-xs font-bold text-white/80 uppercase tracking-widest">综合评分</span>
              <TrendingUp className="w-6 h-6 text-white/90" />
            </div>
            <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-6xl font-black tracking-tighter drop-shadow-sm">{analysis.score}</span>
              <span className="text-lg font-bold text-blue-200">/ 100</span>
            </div>
            <div className="mt-4 inline-block px-3 py-1 bg-white/20 rounded-md text-sm font-bold backdrop-blur-sm relative z-10 border border-white/20">
               {analysis.moodTrend}
            </div>
          </div>

          <div className="space-y-4">
             <div className="bg-gray-50/70 p-5 rounded-2xl border border-border">
                 <div className="flex items-center gap-2.5 mb-3">
                   <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                      <Activity className="w-4 h-4 text-text-muted" strokeWidth={2.5} />
                   </div>
                   <h4 className="text-sm font-bold text-text-main">今日总结</h4>
                 </div>
                 <p className="text-sm font-medium text-text-muted leading-relaxed">
                   {analysis.summary}
                 </p>
             </div>

             <div className="bg-gray-50/70 p-5 rounded-2xl border border-border">
                 <div className="flex items-center gap-2.5 mb-3">
                   <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                      <Lightbulb className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
                   </div>
                   <h4 className="text-sm font-bold text-text-main">明日建议</h4>
                 </div>
                 <p className="text-sm font-medium text-text-muted leading-relaxed">
                   {analysis.advice}
                 </p>
             </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

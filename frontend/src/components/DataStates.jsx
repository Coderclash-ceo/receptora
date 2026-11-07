import React from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

export function SkeletonLoader({ className = "h-4 w-full" }) {
  return <div className={`bg-slate-200/70 animate-pulse rounded-xl ${className}`} />;
}

export function EmptyState({ title, description, icon: Icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50/50 rounded-3xl border border-red-100">
      <div className="w-10 h-10 rounded-2xl bg-red-100/60 flex items-center justify-center text-red-500 mb-2">
        <AlertCircle className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-red-800 mb-1">Failed to load</p>
      <p className="text-xs text-red-600/80 mb-4 max-w-md">{message || "An unexpected error occurred."}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-xs font-semibold text-red-700 rounded-xl hover:bg-red-50 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}

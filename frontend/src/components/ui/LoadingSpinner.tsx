interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-3 text-slate-300" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-300" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

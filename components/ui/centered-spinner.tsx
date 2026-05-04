import { Loader2 } from "lucide-react";

type CenteredSpinnerProps = {
  label?: string;
  className?: string;
};

export function CenteredSpinner({
  label = "Loading...",
  className = "min-h-[40vh]",
}: CenteredSpinnerProps) {
  return (
    <div className={`flex w-full items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 size={28} className="animate-spin text-cyan-600" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

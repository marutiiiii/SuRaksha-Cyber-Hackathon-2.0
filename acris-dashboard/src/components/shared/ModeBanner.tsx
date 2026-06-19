import { useCopilot, useCopilotFeatures } from "@/state/CopilotContext";
import { Sparkles, Check } from "lucide-react";

const LABEL: Record<string, string> = {
  beginner: "Beginner Compliance Officer",
  intermediate: "Intermediate Compliance Officer",
  expert: "Expert Compliance Lead",
};

export default function ModeBanner() {
  const { mode } = useCopilot();
  const features = useCopilotFeatures();
  return (
    <div
      key={mode}
      className="mode-banner animate-fade-in border-b border-zinc-800 bg-zinc-950 px-6 py-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs"
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
        <span className="text-zinc-400">Active mode</span>
        <span className="font-semibold text-zinc-100">{LABEL[mode]}</span>
      </div>
      <div className="h-3 w-px bg-zinc-800 hidden sm:block" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {features.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 text-zinc-400">
            <Check className="h-3 w-3 text-emerald-500" /> {f}
          </span>
        ))}
      </div>
    </div>
  );
}
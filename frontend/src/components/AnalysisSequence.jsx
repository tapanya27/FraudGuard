function AnalysisSequence({ active, stage }) {
  const steps = [
    "Initializing analysis…",
    "Extracting features…",
    "Running 5-fold ensemble…",
    "Calculating SHAP values…",
    "Evaluating threat…",
    "Analysis complete",
  ];

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="panel relative w-full max-w-md overflow-hidden rounded-2xl p-8 text-center">
        <div className="hud-scan-anim pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-accent/20 to-transparent motion-safe:animate-[scan-sweep_1.6s_linear_infinite]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent-soft">
          AI Engine
        </p>
        <p className="mt-3 font-mono text-sm text-ice">{steps[stage] || steps[0]}</p>
        <div className="mt-5 flex justify-center gap-1.5">
          {steps.map((_, index) => (
            <span
              key={index}
              className={`h-1 w-8 rounded-full ${
                index <= stage ? "bg-accent" : "bg-navy-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalysisSequence;

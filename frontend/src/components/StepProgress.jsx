import { WORKFLOW_STEPS } from "../constants/customizer.js";

const StepProgress = ({ activeStep }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
    <div className="grid grid-cols-4 gap-2">
      {WORKFLOW_STEPS.map((step, index) => {
        const stepNo = index + 1;
        const isActive = stepNo === activeStep;
        const isCompleted = stepNo < activeStep;

        return (
          <div key={step} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                isActive
                  ? "bg-brand-600 text-white"
                  : isCompleted
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {isCompleted ? "OK" : stepNo}
            </div>
            <p
              className={`text-center text-[10px] font-semibold uppercase tracking-[0.08em] ${
                isActive ? "text-brand-700" : "text-slate-500"
              }`}
            >
              {step}
            </p>
          </div>
        );
      })}
    </div>
  </div>
);

export default StepProgress;
import { AnimatePresence, motion } from "framer-motion";
import { CANVAS_DIMENSIONS } from "../constants/customizer.js";

const fallbackImage =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 330 430'%3E%3Crect width='330' height='430' rx='24' fill='%23e2e8f0'/%3E%3Crect x='48' y='66' width='234' height='296' rx='28' fill='%23f8fafc' stroke='%23cbd5e1' stroke-width='3'/%3E%3C/svg%3E";

const PrintLocationSheet = ({
  open,
  onClose,
  selectedSides,
  onToggleSide,
  onContinue,
  sideOptions = [],
  productImage
}) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[75] bg-slate-900/55"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.24 }}
          className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-200" />
          <h3 className="mt-4 font-heading text-2xl font-semibold text-slate-900">Choose Print Location</h3>
          <p className="mt-1 text-sm text-slate-600">
            Select one or multiple locations. You can switch and design each side independently.
          </p>

          <div className="mt-4 -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
            {sideOptions.map((side) => {
              const area = side.printableArea;
              const isActive = selectedSides.includes(side.key);
              const sideImage = side.mockupImage || productImage || fallbackImage;

              return (
                <button
                  key={side.key}
                  type="button"
                  onClick={() => onToggleSide(side.key)}
                  className={`min-w-[220px] snap-start rounded-2xl border p-3 text-left transition ${
                    isActive
                      ? "border-brand-400 bg-brand-50 shadow-soft"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="relative overflow-hidden rounded-xl bg-slate-100">
                    <img
                      src={sideImage}
                      alt={side.label}
                      className={`h-44 w-full object-contain ${side.previewClass || ""}`}
                      loading="lazy"
                    />

                    <div
                      className="absolute border border-dashed border-brand-500/80 bg-brand-100/25"
                      style={{
                        left: `${(area.left / CANVAS_DIMENSIONS.width) * 100}%`,
                        top: `${(area.top / CANVAS_DIMENSIONS.height) * 100}%`,
                        width: `${(area.width / CANVAS_DIMENSIONS.width) * 100}%`,
                        height: `${(area.height / CANVAS_DIMENSIONS.height) * 100}%`
                      }}
                    />

                    {isActive ? (
                      <div className="absolute right-2 top-2 inline-flex rounded-full bg-brand-600 px-2 py-1 text-[10px] font-semibold text-white">
                        Selected
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{side.label}</p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onContinue}
            disabled={selectedSides.length === 0}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default PrintLocationSheet;

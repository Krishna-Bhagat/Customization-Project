import { AnimatePresence, motion } from "framer-motion";

const rows = [
  ["XS", "34-36"],
  ["S", "36-38"],
  ["M", "38-40"],
  ["L", "40-42"],
  ["XL", "42-44"],
  ["XXL", "44-46"]
];

const SizeChartModal = ({ open, onClose }) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-slate-900/50 px-4 py-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="font-heading text-xl font-semibold text-slate-900">Size Chart</h3>
          <p className="mt-1 text-sm text-slate-600">Measurements in inches (approx.).</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Size</th>
                  <th className="px-3 py-2 font-semibold">Chest</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-semibold text-slate-800">{row[0]}</td>
                    <td className="px-3 py-2 text-slate-600">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default SizeChartModal;

const SizeChips = ({ sizes }) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {(sizes || []).map((size) => (
      <span
        key={size}
        className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700"
      >
        {size}
      </span>
    ))}
  </div>
);

export default SizeChips;

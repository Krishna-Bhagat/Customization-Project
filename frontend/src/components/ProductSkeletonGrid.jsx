const ProductSkeletonGrid = ({ count = 6 }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-10 animate-pulse rounded-xl bg-slate-200" />
      </div>
    ))}
  </div>
);

export default ProductSkeletonGrid;

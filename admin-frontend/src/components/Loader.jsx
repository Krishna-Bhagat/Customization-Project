const Loader = ({ label = "Loading..." }) => (
  <div className="flex items-center gap-2 text-sm text-slate-600">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
    <span>{label}</span>
  </div>
);

export default Loader;

const EmptyState = ({ title, description, action = null }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
    <h3 className="font-heading text-xl font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export default EmptyState;

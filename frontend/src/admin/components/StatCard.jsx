const StatCard = ({ title, value, hint, tone = "teal" }) => {
  const toneStyles = {
    teal: "from-teal-500/15 to-cyan-500/10 text-teal-700",
    blue: "from-blue-500/15 to-indigo-500/10 text-blue-700",
    purple: "from-violet-500/15 to-fuchsia-500/10 text-violet-700",
    amber: "from-amber-500/15 to-orange-500/10 text-amber-700"
  };

  return (
    <article className="card overflow-hidden">
      <div className={`bg-gradient-to-br px-5 py-5 ${toneStyles[tone] || toneStyles.teal}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <p className="mt-2 font-heading text-3xl font-semibold text-slate-900">{value}</p>
        <p className="mt-1 text-sm text-slate-600">{hint}</p>
      </div>
    </article>
  );
};

export default StatCard;

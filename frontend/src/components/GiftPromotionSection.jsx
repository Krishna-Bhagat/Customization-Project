import { motion } from "framer-motion";

const promoItems = [
  {
    title: "Couple Gifts",
    description: "Match your style with custom couple outfits and keepsakes.",
    gradient: "from-pink-500/90 via-rose-500/85 to-fuchsia-600/85"
  },
  {
    title: "Birthday Surprises",
    description: "Celebrate milestones with thoughtful personalized prints.",
    gradient: "from-amber-500/90 via-orange-500/85 to-rose-500/80"
  },
  {
    title: "Friendship Gifts",
    description: "Create memories for your best friends with unique designs.",
    gradient: "from-cyan-500/90 via-sky-500/80 to-blue-600/85"
  },
  {
    title: "Personalized Fashion",
    description: "Design wearable art for daily style and special moments.",
    gradient: "from-teal-500/90 via-emerald-500/85 to-cyan-600/85"
  }
];

const GiftPromotionSection = () => (
  <section>
    <h2 className="font-heading text-2xl font-semibold text-slate-900">Gifts For Every Emotion</h2>
    <p className="mt-1 text-sm text-slate-600">Make every moment meaningful with a personalized touch.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {promoItems.map((item) => (
        <motion.article
          key={item.title}
          whileHover={{ y: -3 }}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-soft ${item.gradient}`}
        >
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
          <h3 className="relative font-heading text-xl font-semibold">{item.title}</h3>
          <p className="relative mt-2 text-sm text-white/90">{item.description}</p>
        </motion.article>
      ))}
    </div>
  </section>
);

export default GiftPromotionSection;

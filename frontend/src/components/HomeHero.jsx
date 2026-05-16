import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const floatingTransition = {
  duration: 4,
  repeat: Infinity,
  repeatType: "mirror",
  ease: "easeInOut"
};

const HomeHero = () => (
  <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 px-5 py-12 text-white shadow-soft sm:px-8">
    <motion.div
      animate={{ y: [-8, 8] }}
      transition={floatingTransition}
      className="absolute -left-8 top-10 h-24 w-24 rounded-full bg-white/20 blur-sm"
    />
    <motion.div
      animate={{ y: [10, -10] }}
      transition={{ ...floatingTransition, duration: 5 }}
      className="absolute right-6 top-6 h-16 w-16 rounded-full bg-teal-100/30 blur-sm"
    />
    <motion.div
      animate={{ x: [-8, 8] }}
      transition={{ ...floatingTransition, duration: 6 }}
      className="absolute bottom-8 right-14 h-20 w-20 rounded-full bg-cyan-100/20 blur-sm"
    />

    <div className="relative z-10 max-w-3xl">
      <p className="text-xs uppercase tracking-[0.25em] text-teal-100">Gifting Platform</p>
      <h1 className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl">
        Design Your Own Style. Gift Memories That Last Forever.
      </h1>
      <p className="mt-3 text-sm text-cyan-50 sm:text-base">
        Create personalized gifts for loved ones with premium custom prints across apparel and lifestyle products.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/products"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-slate-100"
        >
          Customize Now
        </Link>
        <Link
          to="/products"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/60 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Explore Products
        </Link>
      </div>
    </div>
  </section>
);

export default HomeHero;

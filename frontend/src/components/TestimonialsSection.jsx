import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Riya S.",
    quote: "I designed a birthday hoodie in minutes. The quality and print were beautiful."
  },
  {
    name: "Arjun M.",
    quote: "Perfect for gifting. My custom handkerchief set looked premium and personal."
  },
  {
    name: "Neha P.",
    quote: "The mobile experience is smooth, and the customization tools are super easy."
  }
];

const TestimonialsSection = () => (
  <section>
    <h2 className="font-heading text-2xl font-semibold text-slate-900">Loved By Gift Givers</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {testimonials.map((item) => (
        <motion.article
          key={item.name}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
        >
          <p className="text-sm leading-relaxed text-slate-700">"{item.quote}"</p>
          <p className="mt-4 text-sm font-semibold text-slate-900">{item.name}</p>
        </motion.article>
      ))}
    </div>
  </section>
);

export default TestimonialsSection;

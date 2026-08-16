"use client";

import { UploadCloud, Settings2, Printer, PackageCheck } from "lucide-react";
import { motion } from "motion/react";
import { SectionHeading } from "@/components/common/SectionHeading";

const STEPS = [
  { icon: Settings2,   title: "Configure Your Product", description: "Choose size, paper, finish, quantity, and turnaround. The price updates live as you build your order." },
  { icon: UploadCloud, title: "Upload Your Artwork",    description: "Upload a print-ready PDF, AI, or PSD file. Need help? Design for free on Canva and export direct to us." },
  { icon: Printer,     title: "We Print & Quality-Check", description: "Your job goes to press and every item is checked before packing. Standard, rush, and overnight options available." },
  { icon: PackageCheck,title: "Delivered to Your Door", description: "Carefully packed and shipped to your address. Track your order in real time from your account dashboard." },
];

// Rendered as the last section before the footer (see app/page.tsx) rather than
// mid-page — it's a process explainer, not a catalog-browsing section, so it
// reads better as a footer-adjacent reference than as an interruption between
// product rails.
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="py-8 lg:py-10 border-t border-border bg-secondary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <SectionHeading
            id="how-heading"
            eyebrow="The Process"
            title="How It Works"
            description="From upload to doorstep in as little as one business day"
            align="center"
          />
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center text-center gap-3"
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative"
                >
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-orange text-brand-orange-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {i + 1}
                  </span>
                </motion.div>
                <div>
                  <h3 className="font-heading font-semibold text-xs mb-1">{step.title}</h3>
                  <p className="sr-only sm:not-sr-only text-muted-foreground text-[11px] leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

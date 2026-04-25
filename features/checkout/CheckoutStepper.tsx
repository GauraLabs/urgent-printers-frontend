import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckoutStep = 1 | 2 | 3;

const STEPS = [
  { id: 1, label: "Delivery Address" },
  { id: 2, label: "Payment"          },
  { id: 3, label: "Review & Place"   },
] as const;

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
}

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <nav aria-label="Checkout steps" className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone    = step.id < currentStep;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Step bubble + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                isDone    && "bg-primary border-primary text-primary-foreground",
                isCurrent && "bg-brand-orange border-brand-orange text-brand-orange-foreground scale-110 shadow-md shadow-brand-orange/25",
                !isDone && !isCurrent && "border-border text-muted-foreground bg-background"
              )}>
                {isDone ? <Check size={14} strokeWidth={3} /> : step.id}
              </div>
              <span className={cn(
                "text-[10px] font-semibold whitespace-nowrap hidden sm:block",
                isCurrent && "text-brand-orange",
                isDone    && "text-primary",
                !isDone && !isCurrent && "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2 rounded transition-colors",
                isDone ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

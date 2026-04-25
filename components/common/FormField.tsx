import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.ComponentProps<"input"> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField({ label, error, hint, className, id, ...props }, ref) {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {props.required && <span className="text-destructive ml-0.5">*</span>}
        </label>

        <Input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn("h-10", error && "border-destructive", className)}
          {...props}
        />

        {hint && !error && (
          <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={`${fieldId}-error`}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive"
          >
            <AlertCircle size={12} className="shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField } from "@/components/common/FormField";

type FormFieldProps = React.ComponentProps<typeof FormField>;

export function PasswordField(props: FormFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <FormField {...props} type={show ? "text" : "password"} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? `Hide ${props.label.toLowerCase()}` : `Show ${props.label.toLowerCase()}`}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

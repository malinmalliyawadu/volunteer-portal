"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { label: string; value: string };

type SelectFieldProps = {
  name: string;
  id?: string;
  options: Option[];
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function SelectField({
  name,
  id,
  options,
  placeholder = "Select...",
  defaultValue,
  required,
  disabled,
  className,
}: SelectFieldProps) {
  const [value, setValue] = React.useState<string | undefined>(defaultValue);

  return (
    <div>
      {/* Hidden input to make value available to FormData on submit */}
      <input type="hidden" name={name} value={value ?? ""} />

      <Select value={value} onValueChange={setValue} disabled={disabled}>
        <SelectTrigger
          id={id}
          className={className ?? "w-full"}
          aria-invalid={required && !value ? true : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

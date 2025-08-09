"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

type SelectFieldProps = {
  name: string;
  id?: string;
  options: { value: string; label: string }[];
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
  // Filter out empty string values and convert them to a special "clear" value
  const processedOptions = options.map((opt) => ({
    ...opt,
    value: opt.value === "" ? "__CLEAR__" : opt.value,
  }));

  const [value, setValue] = React.useState<string | undefined>(
    defaultValue === "" ? undefined : defaultValue
  );

  const handleValueChange = (newValue: string) => {
    const actualValue = newValue === "__CLEAR__" ? "" : newValue;
    setValue(newValue === "__CLEAR__" ? undefined : newValue);

    // Emit custom event for form integration
    if (typeof window !== "undefined") {
      const event = new CustomEvent("selectFieldChange", {
        detail: { name, value: actualValue },
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div>
      {/* Hidden input to make value available to FormData on submit */}
      <input
        type="hidden"
        name={name}
        value={value === undefined ? "" : value === "__CLEAR__" ? "" : value}
      />

      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={className ?? "w-full"}
          aria-invalid={required && !value ? true : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {processedOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

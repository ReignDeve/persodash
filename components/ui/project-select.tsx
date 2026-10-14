"use client";

import { Select } from "@/components/ui/select";
import { useProjectOptions } from "@/lib/api/queries";

// Radix Select doesn't allow "" as an item value.
const NONE = "__none";

type ProjectSelectProps = {
  id?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
};

/** "Belongs to project" picker used by monitors and subscriptions. */
export function ProjectSelect({ id, value, onChange }: ProjectSelectProps) {
  const { data } = useProjectOptions();
  return (
    <Select
      id={id}
      value={value || NONE}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
      options={[{ value: NONE, label: "No project" }, ...(data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))]}
    />
  );
}

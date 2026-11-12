import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";

/** What accepting a group link or invitation gives you, as a short checklist. */
export function GroupPassBenefits({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-3 border-t pt-5 text-sm">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

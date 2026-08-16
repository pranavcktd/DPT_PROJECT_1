import { Badge } from "@/components/ui/badge";

/**
 * Shown next to a treasury_payment_date whenever payment_date_is_estimated
 * is true - the date is still the token generated date, not yet confirmed by
 * the treasury's monthly reconciliation statement (see Treasury Reconciliation).
 */
export function EstimatedDateBadge({ estimated }: { estimated: boolean }) {
  if (!estimated) return null;
  return (
    <Badge variant="outline" className="ml-1.5 border-amber-300 text-amber-700">
      Estimated
    </Badge>
  );
}

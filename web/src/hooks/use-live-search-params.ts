"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Drives a set of URL search params as live filters: updates state
 * immediately for a responsive input, then pushes to the URL (debounced for
 * text fields, instant for discrete selects) via router.replace, which
 * re-renders the Server Component without a full page navigation/flash.
 */
export function useLiveSearchParams<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<T>(() => {
    const initial = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const v = searchParams.get(key);
      if (v !== null) (initial as Record<string, string>)[key] = v;
    }
    return initial;
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushParams = useCallback(
    (next: T) => {
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(next)) {
        if (val && val !== defaults[key]) params.set(key, val);
      }
      startTransition(() => {
        router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
      });
    },
    [pathname, router, defaults]
  );

  const setValue = useCallback(
    (key: keyof T, value: string, debounceMs = 300) => {
      const next = { ...values, [key]: value };
      setValues(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (debounceMs === 0) {
        pushParams(next);
      } else {
        debounceRef.current = setTimeout(() => pushParams(next), debounceMs);
      }
    },
    [values, pushParams]
  );

  const reset = useCallback(() => {
    setValues(defaults);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushParams(defaults);
  }, [defaults, pushParams]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  return { values, setValue, reset, isPending };
}

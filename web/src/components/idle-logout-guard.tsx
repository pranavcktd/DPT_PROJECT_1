"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { signOutAction } from "@/app/(app)/dashboard/actions";

// After this long with no mouse/keyboard/touch/scroll activity, show the
// "still there?" warning. It then counts down WARNING_COUNTDOWN_MS before
// signing out automatically if nobody responds.
const IDLE_WARNING_AFTER_MS = 14 * 60 * 1000;
const WARNING_COUNTDOWN_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export function IdleLogoutGuard() {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_COUNTDOWN_MS / 1000);
  const warningOpenRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const clearAllTimers = useCallback(() => {
    clearTimeout(warningTimeoutRef.current);
    clearTimeout(logoutTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  const performSignOut = useCallback(() => {
    clearAllTimers();
    formRef.current?.requestSubmit();
  }, [clearAllTimers]);

  const showWarning = useCallback(() => {
    warningOpenRef.current = true;
    setWarningOpen(true);
    setSecondsLeft(WARNING_COUNTDOWN_MS / 1000);
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    logoutTimeoutRef.current = setTimeout(performSignOut, WARNING_COUNTDOWN_MS);
  }, [performSignOut]);

  const armWarningTimer = useCallback(() => {
    clearAllTimers();
    warningTimeoutRef.current = setTimeout(showWarning, IDLE_WARNING_AFTER_MS);
  }, [clearAllTimers, showWarning]);

  const scheduleWarning = useCallback(() => {
    armWarningTimer();
    warningOpenRef.current = false;
    setWarningOpen(false);
  }, [armWarningTimer]);

  useEffect(() => {
    armWarningTimer();
    const handleActivity = () => {
      if (!warningOpenRef.current) scheduleWarning();
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      clearAllTimers();
    };
  }, [armWarningTimer, scheduleWarning, clearAllTimers]);

  return (
    <>
      <form ref={formRef} action={signOutAction} className="hidden" />
      <Dialog open={warningOpen} onOpenChange={(open) => !open && scheduleWarning()}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Still there?</DialogTitle>
            <DialogDescription>
              You have been inactive for a while. For security, you will be signed out in {secondsLeft}s unless you
              stay signed in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={performSignOut}>
              Sign out now
            </Button>
            <Button onClick={scheduleWarning}>Stay signed in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  timestamp: number;
};

let nextToastId = 1;

/**
 * Add a new toast to the array.
 */
export function addToast(toasts: Toast[], type: ToastType, message: string): Toast[] {
  const toast: Toast = {
    id: `toast-${nextToastId++}`,
    type,
    message,
    timestamp: Date.now(),
  };
  return [...toasts, toast];
}

/**
 * Remove a toast by id.
 */
export function removeToast(toasts: Toast[], id: string): Toast[] {
  return toasts.filter((t) => t.id !== id);
}

/**
 * Remove toasts older than maxAge milliseconds.
 */
export function expireToasts(toasts: Toast[], maxAge: number): Toast[] {
  const cutoff = Date.now() - maxAge;
  return toasts.filter((t) => t.timestamp > cutoff);
}

/**
 * Reset the toast ID counter (for testing).
 */
export function resetToastIdCounter(): void {
  nextToastId = 1;
}

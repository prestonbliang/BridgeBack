"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight, Compass } from "lucide-react";
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="bb-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label={`Close ${title}`}
        onClick={onClose}
      >
        <X />
      </button>
      {children}
    </dialog>
  );
}
export function PageHeading({
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyPlan({ onStart }: { onStart: () => void }) {
  return (
    <section className="card empty-plan">
      <Compass size={32} />
      <h2>Let’s find your first step.</h2>
      <p>
        Choose a sample plan to see its requirements, accepted alternatives, and
        the progress one action can unlock.
      </p>
      <button className="button primary" onClick={onStart}>
        Explore preparation plans <ArrowRight size={17} />
      </button>
    </section>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="plan-progress">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="progress-bar"
      >
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
export function download(name: string, value: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

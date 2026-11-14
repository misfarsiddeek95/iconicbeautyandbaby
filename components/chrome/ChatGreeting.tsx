"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "iconic-chat-greeting-dismissed";

/**
 * Small animated greeting that pops up above the floating WhatsApp button.
 * Dismissals last for the browser session so the full-page navigation used by
 * the rest of the site does not bring it back on every route.
 */
export default function ChatGreeting() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => setOpen(true), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: just hide it for this page */
    }
  }

  return (
    <aside
      className={`chat-hello${open ? " is-open" : ""}`}
      aria-label="Chat with Iconic Beauty & Baby"
    >
      <span className="chat-hello__avatar" aria-hidden="true">
        IB
      </span>
      <div className="chat-hello__body">
        <b>Hi there! 👋</b>
        <p>Need a hand choosing a product? Message us on WhatsApp and we&apos;ll help.</p>
        <a
          className="chat-hello__cta"
          href="https://wa.me/94776290490"
          target="_blank"
          rel="noopener"
        >
          Say hello
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
      <button
        className="chat-hello__close"
        type="button"
        onClick={dismiss}
        aria-label="Dismiss chat greeting"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </aside>
  );
}

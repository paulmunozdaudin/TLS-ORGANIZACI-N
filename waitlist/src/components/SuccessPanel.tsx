"use client";

import { useEffect, useRef, useState } from "react";
import { REFERRAL_BOOST } from "@/config/site";
import { form } from "@/content/landing";
import type { JoinState } from "@/lib/waitlist";

type Props = {
  result: Extract<JoinState, { status: "success" }>;
  className?: string;
};

/** Confirmación tras apuntarse, con el enlace personal para invitar. */
export default function SuccessPanel({ result, className = "" }: Props) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL solo se conoce en el cliente
    setOrigin(window.location.origin);
    headingRef.current?.focus();
  }, []);

  const link = `${origin}/?ref=${result.code}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${form.success.shareText} ${link}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const input = document.getElementById(`share-${result.code}`) as HTMLInputElement | null;
      input?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`swap grid gap-6 ${className}`} role="status" aria-live="polite">
      <div className="grid gap-2">
        <p ref={headingRef} tabIndex={-1} className="display text-[clamp(2rem,1.5rem+2vw,3rem)] outline-none">
          {result.already ? form.success.already : form.success.title}
        </p>
        <p className="text-step-body text-ink">
          {result.place ? `${form.success.position(result.place)} ` : ""}
          {form.success.share(REFERRAL_BOOST)}
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor={`share-${result.code}`} className="text-step-small font-medium">
          {form.success.linkLabel}
        </label>
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <input
            id={`share-${result.code}`}
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="tabular h-13 min-w-0 flex-1 bg-surface px-4 text-ink outline-none focus:bg-bg"
          />
          <button type="button" onClick={copy} className="button sm:w-36">
            <span aria-live="polite">{copied ? form.success.copied : form.success.copy}</span>
          </button>
        </div>
      </div>

      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="link w-fit text-step-small font-medium">
        {form.success.whatsapp}
      </a>
    </div>
  );
}

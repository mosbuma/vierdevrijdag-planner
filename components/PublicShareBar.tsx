"use client";

import { useEffect, useState } from "react";
import { FaLinkedin, FaTelegram, FaWhatsapp } from "react-icons/fa6";
import { HiCheck, HiClipboardDocument, HiEnvelope, HiShare } from "react-icons/hi2";
import { SiSignal } from "react-icons/si";

type Props = {
  url: string;
  title: string;
  className?: string;
};

const iconBtn =
  "group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-500/80 !bg-slate-800 !text-slate-200 no-underline shadow-sm transition-colors hover:border-teal-500/70 hover:!bg-slate-700 hover:!text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

const iconClass = "size-[1.15rem]";

export function PublicShareBar({ url, title, className = "" }: Props) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const textCombined = encodeURIComponent(`${title}\n${url}`);
  const encodedBody = encodeURIComponent(`${title}\n\n${url}`);
  const signalHref = `sgnl://send?text=${encodeURIComponent(`${title}\n${url}`)}`;

  async function onNativeShare() {
    try {
      await navigator.share({ title, text: title, url });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
    }
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Kopieer deze link:", url);
    }
  }

  const mailtoHref = `mailto:?subject=${encodedTitle}&body=${encodedBody}`;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {canNativeShare ? (
        <button
          type="button"
          className={iconBtn}
          onClick={() => void onNativeShare()}
          aria-label="Delen via dit apparaat"
          title="Delen via dit apparaat"
        >
          <HiShare className={iconClass} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className={iconBtn}
        onClick={() => void onCopyLink()}
        aria-label={copied ? "Link gekopieerd" : "Link kopiëren"}
        title={copied ? "Gekopieerd" : "Link kopiëren"}
      >
        {copied ? (
          <HiCheck className={`${iconClass} text-teal-400`} aria-hidden />
        ) : (
          <HiClipboardDocument className={iconClass} aria-hidden />
        )}
      </button>
      <a className={iconBtn} href={mailtoHref} aria-label="Delen via e-mail" title="E-mail">
        <HiEnvelope className={iconClass} aria-hidden />
      </a>
      <a
        className={`${iconBtn} hover:!text-[#3A76F0]`}
        href={signalHref}
        aria-label="Openen in Signal"
        title="Signal (app); anders link kopiëren"
      >
        <SiSignal className={iconClass} aria-hidden />
      </a>
      <a
        className={`${iconBtn} hover:!text-[#25D366]`}
        href={`https://wa.me/?text=${textCombined}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Delen via WhatsApp"
        title="WhatsApp"
      >
        <FaWhatsapp className={iconClass} aria-hidden />
      </a>
      <a
        className={`${iconBtn} hover:!text-[#26A5E4]`}
        href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Delen via Telegram"
        title="Telegram"
      >
        <FaTelegram className={iconClass} aria-hidden />
      </a>
      <a
        className={`${iconBtn} hover:!text-[#0A66C2]`}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Delen op LinkedIn"
        title="LinkedIn"
      >
        <FaLinkedin className={iconClass} aria-hidden />
      </a>
    </div>
  );
}

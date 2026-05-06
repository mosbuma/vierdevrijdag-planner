import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "div",
  "span",
  "blockquote",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

/** Class marker for paragraphs that only exist as vertical spacing (TipTap blank lines). */
export const BLANK_PARA_CLASS = "vdv-blank-line";

let purifyHooksInstalled = false;

function ensurePurifyBlankParagraphHooks() {
  if (purifyHooksInstalled) return;
  purifyHooksInstalled = true;

  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    const tag = String(data?.tagName ?? "").toLowerCase();
    if (tag !== "p") return;
    const el = node as unknown as Element;
    const doc = el.ownerDocument;
    if (!doc) return;

    const kids = Array.from(el.childNodes);
    const textAll = (el.textContent ?? "").replace(/\u00a0/g, " ").trim();
    const onlyBrOrWsChildren =
      kids.length > 0 &&
      kids.every(
        (c) =>
          c.nodeName === "BR" ||
          (c.nodeType === 3 && !String(c.textContent ?? "").replace(/\u00a0/g, " ").trim()),
      );

    if (kids.length === 0 || (textAll === "" && onlyBrOrWsChildren)) {
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(doc.createElement("br"));
      el.classList.add(BLANK_PARA_CLASS);
    }
  });
}

/**
 * Strip unsafe HTML for stored meetup descriptions.
 * Returns `null` when there is nothing meaningful left to store.
 */
export function sanitizeMeetingDescriptionHtml(dirty: string | null | undefined): string | null {
  if (dirty == null) return null;
  const s = String(dirty);
  if (!s.trim()) return null;
  ensurePurifyBlankParagraphHooks();
  const clean = DOMPurify.sanitize(s, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  const t = clean.trim();
  return t ? t : null;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { extractHeadings } from "./Markdown";

/** "Dans ce cours": the lesson's parts, with the one being read highlighted while scrolling. */
export default function LessonToc({ content }: { content: string }) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [active, setActive] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headings.length < 3) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.3) current = h.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  // Keep the current part visible inside the ToC's own scroll area.
  useEffect(() => {
    const box = listRef.current;
    const item = box?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!box || !item) return;
    if (item.offsetTop < box.scrollTop || item.offsetTop + item.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = item.offsetTop - box.clientHeight / 2;
    }
  }, [active]);

  if (headings.length < 3) return null;

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActive(id);
  };

  return (
    <nav aria-label="Dans ce cours" className="card p-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Dans ce cours</h3>
      <div ref={listRef} className="relative max-h-[42vh] overflow-y-auto pr-1">
        <ul className="space-y-0.5 border-l border-slate-200">
          {headings.map((h) => {
            const current = h.id === active;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={(e) => go(e, h.id)}
                  aria-current={current ? "location" : undefined}
                  className={`-ml-px block border-l-2 py-1.5 pr-2 text-sm leading-snug transition-colors ${h.level === 3 ? "pl-6" : "pl-3"} ${
                    current
                      ? "border-brand-600 font-semibold text-brand-800"
                      : "border-transparent text-slate-600 hover:border-slate-300 hover:text-ink"
                  }`}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

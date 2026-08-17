import { useEffect, useRef } from "react";

function canUseCustomCursor() {
  return (
    window.matchMedia("(hover: hover)").matches &&
    window.matchMedia("(pointer: fine)").matches
  );
}

function resolveState(node) {
  if (!node || !(node instanceof Element)) return "default";
  const el = node.closest(
    "a, button, [role='button'], [data-interactive], input, textarea, select, [contenteditable='true']"
  );
  if (!el) return "default";
  if (el.matches("input, textarea, select, [contenteditable='true']")) return "text";
  if (el.disabled || el.getAttribute("aria-disabled") === "true") return "disabled";
  if (el.getAttribute("data-cursor") === "danger" || el.className?.includes?.("bg-fraud")) {
    return "danger";
  }
  if (el.getAttribute("data-cursor") === "success") return "success";
  if (el.getAttribute("data-cursor") === "warning") return "warning";
  return "interactive";
}

function CustomCursor() {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const trailRefs = useRef([]);
  const pos = useRef({ x: -40, y: -40 });
  const trail = useRef([
    { x: -40, y: -40 },
    { x: -40, y: -40 },
    { x: -40, y: -40 },
  ]);
  const raf = useRef(0);

  useEffect(() => {
    if (!canUseCustomCursor()) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.setAttribute("data-cursor", "on");

    const ring = ringRef.current;
    const dot = dotRef.current;

    function loop() {
      const { x, y } = pos.current;
      if (ring) ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (dot) dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

      if (!reduced) {
        trail.current.forEach((point, index) => {
          const prev = index === 0 ? pos.current : trail.current[index - 1];
          point.x += (prev.x - point.x) * 0.28;
          point.y += (prev.y - point.y) * 0.28;
          const node = trailRefs.current[index];
          if (node) {
            node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
            node.style.opacity = String(0.28 - index * 0.08);
          }
        });
      }

      raf.current = requestAnimationFrame(loop);
    }

    function onMove(event) {
      pos.current = { x: event.clientX, y: event.clientY };
    }

    function onOver(event) {
      const state = resolveState(event.target);
      document.documentElement.setAttribute("data-cursor-state", state);
    }

    function onDown() {
      if (reduced) return;
      document.documentElement.classList.add("cursor-click");
    }

    function onUp() {
      document.documentElement.classList.remove("cursor-click");
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    raf.current = requestAnimationFrame(loop);

    return () => {
      document.documentElement.removeAttribute("data-cursor");
      document.documentElement.removeAttribute("data-cursor-state");
      document.documentElement.classList.remove("cursor-click");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="fg-cursor" aria-hidden="true">
      <span ref={ringRef} className="fg-cursor-ring" />
      <span ref={dotRef} className="fg-cursor-dot" />
      <span ref={(el) => (trailRefs.current[0] = el)} className="fg-cursor-trail" />
      <span ref={(el) => (trailRefs.current[1] = el)} className="fg-cursor-trail" />
      <span ref={(el) => (trailRefs.current[2] = el)} className="fg-cursor-trail" />
    </div>
  );
}

export default CustomCursor;

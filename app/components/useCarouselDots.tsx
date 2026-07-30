import { useEffect, useState, type RefObject } from "react";

/**
 * Track which snap-scrolled card is currently visible so the dot indicator can
 * follow along, matching the legacy IntersectionObserver behaviour.
 */
export function useCarouselDots(
  trackRef: RefObject<HTMLDivElement | null>,
  cardCount: number,
) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || cardCount < 2) return;
    const cards = Array.from(track.children);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveIndex(cards.indexOf(entry.target));
          }
        }
      },
      { threshold: 0.6, root: track },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [trackRef, cardCount]);

  return activeIndex;
}

export function CarouselDots({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  return (
    <div className="flex-none flex justify-center items-center gap-2 pt-3 pb-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`carousel-dot${i === activeIndex ? " active" : ""}`} />
      ))}
    </div>
  );
}

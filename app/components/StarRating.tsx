import { useFetcher } from "react-router";

import { StarIcon } from "./icons";

export function StarRating({ beanId, rating }: { beanId: number; rating: number | null }) {
  const fetcher = useFetcher();
  // Optimistically show the rating being submitted.
  const shown = fetcher.formData
    ? Number(fetcher.formData.get("rating"))
    : (rating ?? 0);

  return (
    <div className="flex gap-1 -ml-1">
      {[1, 2, 3].map((value) => (
        <button
          key={value}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fetcher.submit(
              { intent: "rate", bean_id: String(beanId), rating: String(value) },
              { method: "post" },
            );
          }}
          className="btn-circle bg-transparent text-coffee/25 dark:text-stone-500 hover:text-amber dark:hover:text-amber focus:outline-none focus:ring-2 focus:ring-amber/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-stone-800 touch-manipulation transition-colors duration-200"
          aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
        >
          <StarIcon className={`w-6 h-6${value <= shown ? " text-amber" : ""}`} />
        </button>
      ))}
    </div>
  );
}

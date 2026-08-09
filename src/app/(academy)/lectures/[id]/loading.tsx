/**
 * Skeleton loading state for individual lecture pages.
 * Shows a content-shaped placeholder while the lecture HTML loads.
 */
export default function LectureLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-16">
      {/* Title skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-3/4 rounded bg-muted" />
      </div>

      {/* Content skeleton — mimics paragraphs */}
      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>

        {/* Code block skeleton */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-3 w-3/5 rounded bg-muted" />
        </div>

        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
      </div>

      {/* Navigation skeleton */}
      <div className="flex justify-between pt-8 border-t">
        <div className="h-10 w-28 rounded bg-muted" />
        <div className="h-10 w-28 rounded bg-muted" />
      </div>
    </div>
  );
}

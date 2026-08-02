"use client";

// Remounting the inner span on every `value` change (via `key`) re-plays
// the existing `card-in` keyframe instead of snapping straight to the new
// number -- no manual useState/useEffect diffing needed.
export default function AnimatedCount({ value }) {
  return (
    <span key={value} className="inline-block animate-card-in">
      {value}
    </span>
  );
}

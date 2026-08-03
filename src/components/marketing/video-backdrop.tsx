import heroVideo from "@/assets/nexus-hero.mp4.asset.json";
import heroPoster from "@/assets/nexus-hero-poster.jpg.asset.json";
import { cn } from "@/lib/utils";

/** Full-bleed institutional video used on the landing hero and the login screen. */
export function VideoBackdrop({ className, overlay = true }: { className?: string; overlay?: boolean }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <video
        className="size-full object-cover"
        src={heroVideo.url}
        poster={heroPoster.url}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      {overlay && (
        <>
          <div className="absolute inset-0 bg-[oklch(0.13_0.008_290)]/72" />
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.13_0.008_290)]/80 via-transparent to-[oklch(0.13_0.008_290)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_60%)]" />
        </>
      )}
    </div>
  );
}
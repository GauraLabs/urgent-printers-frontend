import type { ReactNode } from "react";
import Link from "next/link";
import { getAnnouncement } from "@/lib/api";
import { AnnouncementCountdown } from "./AnnouncementCountdown";

const PLACEHOLDER = "{{timer}}";

function isInFuture(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}

function renderMessage(message: string, targetIso: string): ReactNode[] {
  const segments = message.split(PLACEHOLDER);
  const nodes: ReactNode[] = [];

  segments.forEach((segment, index) => {
    if (segment) nodes.push(<span key={`text-${index}`}>{segment}</span>);
    if (index < segments.length - 1) {
      nodes.push(<AnnouncementCountdown key={`timer-${index}`} targetIso={targetIso} />);
    }
  });

  return nodes;
}

export async function AnnouncementBar() {
  const announcement = await getAnnouncement();
  if (!announcement) return null;

  const countdownTarget = announcement.countdown_end_at;
  const hasPlaceholder = announcement.message.includes(PLACEHOLDER);
  const active = countdownTarget !== null && isInFuture(countdownTarget);
  const expired = hasPlaceholder && countdownTarget !== null && !isInFuture(countdownTarget);
  if (expired) return null;

  const content =
    hasPlaceholder && active && countdownTarget !== null
      ? renderMessage(announcement.message, countdownTarget)
      : hasPlaceholder
        ? announcement.message.replace(PLACEHOLDER, "").replace(/\s{2,}/g, " ").trim()
        : announcement.message;

  return (
    <div
      className="flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium py-2 px-4"
      style={{ backgroundColor: announcement.bg_color, color: announcement.text_color }}
    >
      <p className="truncate min-w-0">
        {content}
        {announcement.link_url && announcement.link_text && (
          <>
            {" "}
            <Link href={announcement.link_url} className="underline underline-offset-2 font-semibold">
              {announcement.link_text}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useScrollRail } from "./useScrollRail";
import { ScrollRailButtons } from "./ScrollRailButtons";

interface RailShellProps {
  /** Server-rendered title block. */
  heading: ReactNode;
  /** Server-rendered "see all" link. */
  seeAll: ReactNode;
  children: ReactNode;
}

// The only client state a rail needs is scroll-edge tracking for its prev/next
// buttons; everything else (heading, link, section chrome) stays on the server.
export function RailShell({ heading, seeAll, children }: RailShellProps) {
  const { trackRef, canScrollLeft, canScrollRight, scrollByPage } = useScrollRail();

  return (
    <>
      <div className="flex items-end justify-between gap-4 mb-3 md:mb-4 lg:mb-6">
        {heading}
        <div className="flex items-center gap-4 shrink-0">
          {seeAll}
          <ScrollRailButtons canScrollLeft={canScrollLeft} canScrollRight={canScrollRight} onScroll={scrollByPage} />
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide gap-4 lg:gap-6 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-2 -my-2 scroll-pl-4 scroll-pr-4 sm:scroll-pl-6 sm:scroll-pr-6 lg:scroll-pl-8 lg:scroll-pr-8"
      >
        {children}
      </div>
    </>
  );
}

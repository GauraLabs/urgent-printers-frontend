export function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm font-medium py-2 px-4">
      <p className="sm:hidden truncate">🚚 Free delivery over ₹999 · Next-day dispatch</p>
      <p className="hidden sm:block truncate">
        🚚 Free delivery on orders over ₹999 &nbsp;·&nbsp; 📞 1800-123-4567 &nbsp;·&nbsp; Next-day dispatch available
      </p>
    </div>
  );
}

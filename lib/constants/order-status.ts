export const ORDER_STATUS_COLORS: Record<string, string> = {
  placed: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  artwork_pending: "bg-brand-orange/10 text-brand-orange",
  artwork_approved: "bg-accent text-accent-foreground",
  printing: "bg-brand-orange/10 text-brand-orange",
  shipped: "bg-secondary text-secondary-foreground",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  refund_initiated: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
};

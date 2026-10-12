/** Orders at or above this (after discounts, GST-inclusive) ship free. */
export const SHIPPING_THRESHOLD = 999;
export const SHIPPING_COST = 99;

/** /policies/shipping: "Standard (5-7 business days)". */
export const STANDARD_TRANSIT_DAYS = { min: 5, max: 7 } as const;
/** /policies/shipping: "Standard turnaround is 2-3 business days before dispatch". */
export const DEFAULT_HANDLING_DAYS = { min: 2, max: 3 } as const;
/** /policies/returns: quality issues must be reported within 7 days of delivery. */
export const RETURN_WINDOW_DAYS = 7;

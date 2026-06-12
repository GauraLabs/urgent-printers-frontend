import Link from "next/link";
import { Printer, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";

const PRODUCT_LINKS = [
  { label: "Business Cards", href: ROUTES.category("business-cards") },
  { label: "Flyers", href: ROUTES.category("flyers") },
  { label: "Banners", href: ROUTES.category("banners") },
  { label: "Packaging", href: ROUTES.category("packaging") },
  { label: "Brochures", href: ROUTES.category("brochures") },
  { label: "Custom Merch", href: ROUTES.category("custom-merch") },
];

const ACCOUNT_LINKS = [
  { label: "Sign In", href: ROUTES.login },
  { label: "Create Account", href: ROUTES.register },
  { label: "My Orders", href: ROUTES.accountOrders },
  { label: "Saved Items", href: ROUTES.accountSaved },
  { label: "Addresses", href: ROUTES.accountAddresses },
];

const SUPPORT_LINKS = [
  { label: "Contact Us",          href: "/contact"                        },
  { label: "Artwork Guidelines",  href: "/policies/artwork-guidelines"    },
  { label: "Shipping Info",       href: "/policies/shipping"              },
  { label: "Returns Policy",      href: "/policies/returns"               },
  { label: "Privacy Policy",      href: "/policies/privacy"               },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href={ROUTES.home}
              className="inline-flex items-center gap-2 font-heading font-bold text-primary mb-4"
            >
              <Printer size={20} className="text-brand-orange" />
              <span>
                Urgent<span className="text-brand-orange">Printers</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Premium print solutions delivered fast. Quality that speaks before you do.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone size={13} className="shrink-0" />
                <a href="tel:+911800123456" className="hover:text-foreground transition-colors">
                  1800-123-4567 (Toll Free)
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={13} className="shrink-0" />
                <a href="mailto:hello@urgentprinters.in" className="hover:text-foreground transition-colors">
                  hello@urgentprinters.in
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={13} className="shrink-0 mt-0.5" />
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Kotwali+Rd%2C+opposite+Punjab+National+Bank%2C+Tilak+Dwar%2C+Mathura%2C+Uttar+Pradesh+281001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Kotwali Rd, Tilak Dwar, Mathura, UP 281001
                </a>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-heading font-semibold text-sm mb-4">Products</h3>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-heading font-semibold text-sm mb-4">Account</h3>
            <ul className="space-y-2.5">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-heading font-semibold text-sm mb-4">Support</h3>
            <ul className="space-y-2.5">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Urgent Printers Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/policies/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/policies/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/policies/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

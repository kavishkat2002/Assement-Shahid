/**
 * @file SiteFooter.tsx
 * @description Global footer containing organization background, fleet links,
 * legal navigation, company contact channels, and dynamic copyright metadata.
 */

import { Link } from "@tanstack/react-router";

/**
 * SiteFooter component.
 * Renders across all public customer views with consistent contrast branding.
 */
export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 bg-navy text-navy-foreground">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand narrative and strategic location */}
        <div>
          <p className="font-display text-lg font-bold">SwiftDrive Rentals</p>
          <p className="mt-2 text-sm opacity-80 leading-relaxed">
            Car, SUV, van and luxury vehicle rentals from Negombo, Sri Lanka.
          </p>
        </div>

        {/* Vehicle hire navigation */}
        <div>
          <p className="text-sm font-semibold tracking-wide">Rent</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li>
              <Link to="/vehicles" className="hover:underline">
                Browse vehicles
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:underline">
                Rental terms
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:underline">
                My bookings
              </Link>
            </li>
          </ul>
        </div>

        {/* Corporate & editorial links */}
        <div>
          <p className="text-sm font-semibold tracking-wide">Company</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li>
              <Link to="/about" className="hover:underline">
                About us
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:underline">
                Travel guides
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:underline">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        {/* Physical location and dispatch desk details */}
        <div>
          <p className="text-sm font-semibold tracking-wide">Visit us</p>
          <address className="mt-3 space-y-1 text-sm not-italic opacity-80">
            <p>Negombo, Sri Lanka</p>
            <p>Contact details: to be confirmed</p>
          </address>
        </div>
      </div>

      {/* Copyright row */}
      <div className="border-t border-navy-foreground/15">
        <p className="container-page py-4 text-xs opacity-70">
          © {currentYear} SwiftDrive Rentals. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

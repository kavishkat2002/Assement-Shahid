import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-navy text-navy-foreground">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold">SwiftDrive Rentals</p>
          <p className="mt-2 text-sm opacity-80">Car, SUV, van and luxury vehicle rentals from Negombo, Sri Lanka.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Rent</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li><Link to="/vehicles">Browse vehicles</Link></li>
            <li><Link to="/terms">Rental terms</Link></li>
            <li><Link to="/account">My bookings</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Company</p>
          <ul className="mt-3 space-y-2 text-sm opacity-80">
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/blog">Travel guides</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Visit us</p>
          <address className="mt-3 space-y-1 text-sm not-italic opacity-80">
            <p>Negombo, Sri Lanka</p>
            <p>Contact details: to be confirmed</p>
          </address>
        </div>
      </div>
      <div className="border-t border-navy-foreground/15">
        <p className="container-page py-4 text-xs opacity-70">© {new Date().getFullYear()} SwiftDrive Rentals. Vehicles and prices shown are demonstration data.</p>
      </div>
    </footer>
  );
}

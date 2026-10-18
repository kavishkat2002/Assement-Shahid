import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, todayColombo } from "@/lib/format";
import { validateDates } from "@/lib/booking";
import { getCategories } from "@/services/vehicles";
import { selectClass } from "./common";

export const LOCATIONS = ["Negombo", "Bandaranaike Airport", "Colombo"];

export function SearchBar() {
  const today = todayColombo();
  const navigate = useNavigate();
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const [location, setLocation] = useState("");
  const [pickup, setPickup] = useState(addDays(today, 1));
  const [ret, setRet] = useState(addDays(today, 4));
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateDates(pickup, ret, today);
    if (err) return setError(err);
    setError("");
    navigate({ to: "/vehicles", search: { pickup, ret, location: location || undefined, category: category || undefined } });
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4 shadow-sm sm:p-5" aria-label="Search vehicles">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
        <div className="space-y-1.5">
          <label htmlFor="s-loc" className="text-sm font-medium">Pickup location</label>
          <select id="s-loc" className={selectClass} value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">Any location</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="s-pick" className="text-sm font-medium">Pickup date</label>
          <Input id="s-pick" type="date" min={today} value={pickup} onChange={(e) => setPickup(e.target.value)} className="h-10 bg-card" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="s-ret" className="text-sm font-medium">Return date</label>
          <Input id="s-ret" type="date" min={pickup} value={ret} onChange={(e) => setRet(e.target.value)} className="h-10 bg-card" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="s-cat" className="text-sm font-medium">Vehicle type</label>
          <select id="s-cat" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All types</option>
            {cats?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <Button type="submit" size="lg" className="h-10">Search</Button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </form>
  );
}

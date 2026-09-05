import { SearchBar } from "@/components/SearchBar";

export function Hero() {
  return (
    <div className="h-full flex flex-col justify-center">
      <h1 className="text-display-lg text-on-surface mb-4">
        Find your next role at{" "}
        <span className="text-primary">startups &amp; MNCs</span>
      </h1>
      <p className="text-body-lg text-on-surface-variant mb-8">
        Bangalore, India &bull; Remote &bull; Filtered by date, skills, and
        company type
      </p>
      <SearchBar />
    </div>
  );
}

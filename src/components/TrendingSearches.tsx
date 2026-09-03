import { getTrendingSearches } from "@/lib/repositories/search.repository";
import Link from "next/link";

export async function TrendingSearches() {
  const trending = await getTrendingSearches(8);

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-label-md text-on-surface uppercase tracking-wider mb-4">
        Trending Searches
      </h3>
      <div className="flex flex-wrap gap-2 content-start">
        {trending.length === 0 ? (
          <p className="text-label-sm text-on-surface-variant">
            No trending searches yet.
          </p>
        ) : (
          trending.map((item) => (
            <Link
              key={item.query}
              href={`/jobs?q=${encodeURIComponent(item.query)}`}
              className="px-3 py-1.5 bg-surface-container text-on-surface-variant text-label-sm rounded-full hover:bg-surface-container-high transition-colors"
            >
              {item.query}
              <span className="ml-1 text-on-tertiary-container">
                ({item.count})
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

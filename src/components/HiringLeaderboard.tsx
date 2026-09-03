import { getCompaniesHiringActively } from "@/lib/repositories/companies.repository";

export async function HiringLeaderboard() {
  const companies = await getCompaniesHiringActively(8);

  if (companies.length === 0) return null;

  return (
    <div>
      <h3 className="text-label-md text-on-surface uppercase tracking-wider mb-5">
        Companies Hiring Actively
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {companies.slice(0, 4).map((company) => (
          <div
            key={company.id}
            className="flex items-center gap-3 p-4 rounded-lg border border-outline-variant bg-surface-container-lowest hover:border-outline transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
              <span className="text-label-md font-bold text-on-primary-container">
                {company.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-label-md text-on-surface truncate">
                {company.name}
              </p>
              <p className="text-label-sm text-tertiary">
                {company.openRoles} open role{company.openRoles !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { getCompaniesHiringActively } from "@/lib/repositories/companies.repository";

export async function GET() {
  const companies = await getCompaniesHiringActively();
  return Response.json(companies);
}

import { runNightly } from "@/lib/matching/nightly";

export const maxDuration = 300;

export async function GET() {
  try {
    const result = await runNightly();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}

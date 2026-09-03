import { runIngestionPipeline } from "@/lib/ingestion/pipeline";

export async function GET() {
  try {
    await runIngestionPipeline();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 });
  }
}

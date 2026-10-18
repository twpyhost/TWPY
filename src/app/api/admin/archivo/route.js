import {
  archiveAdmin,
  archiveBody,
  archiveCheck,
  archiveError,
  saveArchive,
} from "@/lib/archiveAdmin";
export async function GET() {
  const auth = await archiveAdmin();
  if (auth.error) return auth.error;
  try {
    const entries = archiveCheck(
      await auth.db
        .from("archive_entries")
        .select("id,slug,title,status,season,date")
        .order("date", { ascending: false }),
    );
    const assets = archiveCheck(
      await auth.db.from("archive_assets").select("bytes"),
    );
    return Response.json(
      {
        entries,
        usedBytes: assets.reduce((s, a) => s + a.bytes, 0),
        limitBytes: 104857600,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return archiveError(error);
  }
}
export async function POST(request) {
  const auth = await archiveAdmin();
  if (auth.error) return auth.error;
  try {
    const result = await saveArchive(
      auth.db,
      JSON.parse((await archiveBody(request)).toString()),
    );
    return result.error ?? Response.json(result.row, { status: 201 });
  } catch (error) {
    return archiveError(error);
  }
}

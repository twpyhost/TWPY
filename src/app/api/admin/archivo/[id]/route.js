import {
  archiveAdmin,
  archiveBody,
  archiveError,
  saveArchive,
  adminArchiveEntry,
} from "@/lib/archiveAdmin";
export async function GET(request, { params }) {
  const { id } = await params;
  const auth = await archiveAdmin(id);
  if (auth.error) return auth.error;
  try {
    const row = await adminArchiveEntry(auth.db, id);
    return Response.json(row ?? { error: "Crónica no encontrada" }, {
      status: row ? 200 : 404,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return archiveError(error);
  }
}
export async function PATCH(request, { params }) {
  const { id } = await params;
  const auth = await archiveAdmin(id);
  if (auth.error) return auth.error;
  try {
    const result = await saveArchive(
      auth.db,
      JSON.parse((await archiveBody(request)).toString()),
      id,
    );
    return result.error ?? Response.json(result.row);
  } catch (error) {
    return archiveError(error);
  }
}

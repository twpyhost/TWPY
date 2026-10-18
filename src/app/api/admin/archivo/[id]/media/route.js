import {
  archiveAdmin,
  archiveBody,
  archiveCheck,
  archiveError,
  archiveInvalidate,
} from "@/lib/archiveAdmin";
import { isArchiveId } from "@/lib/archive";
import { uploadArchiveMedia, cleanupArchiveMedia } from "@/lib/archiveMedia";
async function context(params) {
  const { id } = await params;
  const auth = await archiveAdmin(id);
  if (auth.error) return auth;
  const row = archiveCheck(
    await auth.db
      .from("archive_entries")
      .select("slug,status")
      .eq("id", id)
      .maybeSingle(),
  );
  if (!row)
    return {
      error: Response.json({ error: "Crónica no encontrada" }, { status: 404 }),
    };
  return { ...auth, id, row };
}
export async function POST(request, { params }) {
  try {
    const ctx = await context(params);
    if (ctx.error) return ctx.error;
    const bytes = await archiveBody(request, 2097152 + 65536);
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Falta la imagen");
    await cleanupArchiveMedia(ctx.db);
    const id = await uploadArchiveMedia(ctx.db, ctx.id, file, {
      caption: String(form.get("caption") ?? ""),
      credit: String(form.get("credit") ?? ""),
    });
    archiveInvalidate([ctx.row.slug]);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return archiveError(error);
  }
}
export async function PATCH(request, { params }) {
  try {
    const ctx = await context(params);
    if (ctx.error) return ctx.error;
    const body = JSON.parse((await archiveBody(request)).toString());
    if (body.order) {
      if (
        !Array.isArray(body.order) ||
        body.order.length > 1000 ||
        !body.order.every(isArchiveId)
      )
        throw new Error("Orden inválido");
      archiveCheck(
        await ctx.db.rpc("reorder_archive_assets", {
          p_entry_id: ctx.id,
          p_ids: body.order,
        }),
      );
    } else {
      if (
        !isArchiveId(body.id) ||
        typeof body.caption !== "string" ||
        typeof body.credit !== "string" ||
        body.caption.length > 500 ||
        body.credit.length > 200 ||
        (ctx.row.status === "published" &&
          (!body.caption.trim() || !body.credit.trim()))
      )
        throw new Error("Leyenda y crédito inválidos");
      const row = archiveCheck(
        await ctx.db.rpc("edit_archive_asset", {
          p_entry_id: ctx.id,
          p_id: body.id,
          p_caption: body.caption,
          p_credit: body.credit,
        }),
      );
      if (!row)
        return Response.json(
          { error: "Imagen no encontrada" },
          { status: 404 },
        );
    }
    archiveInvalidate([ctx.row.slug]);
    return Response.json({ ok: true });
  } catch (error) {
    return archiveError(error);
  }
}
export async function DELETE(request, { params }) {
  try {
    const ctx = await context(params);
    if (ctx.error) return ctx.error;
    const body = JSON.parse((await archiveBody(request)).toString());
    if (!isArchiveId(body.id)) throw new Error("ID inválido");
    archiveCheck(
      await ctx.db.rpc("retire_archive_asset", {
        p_entry_id: ctx.id,
        p_id: body.id,
      }),
    );
    archiveInvalidate([ctx.row.slug]);
    await cleanupArchiveMedia(ctx.db);
    return Response.json({ ok: true });
  } catch (error) {
    return archiveError(error);
  }
}

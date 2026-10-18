import { test, expect } from "@playwright/test";
test("Liga role cannot edit archive or upload media", async ({
  page,
  request,
}) => {
  await page.goto("/admin/archivo");
  await expect(page).toHaveURL(/no-autorizado/);
  expect(
    (await request.post("/api/admin/archivo", { data: {} })).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`/api/admin/archivo/${crypto.randomUUID()}/media`, {
        multipart: {
          file: {
            name: "photo.png",
            mimeType: "image/png",
            buffer: Buffer.from("bad"),
          },
        },
      })
    ).status(),
  ).toBe(403);
});

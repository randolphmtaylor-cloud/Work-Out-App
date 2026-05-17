import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/user";
import { updateImportBatch } from "@/lib/data";

const UpdateImportSchema = z.object({
  source_file_name: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  const { id } = await params;
  let body: z.infer<typeof UpdateImportSchema>;
  try {
    body = UpdateImportSchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: "Invalid request", details: error }, { status: 400 });
  }

  const patch = {
    ...(body.source_file_name !== undefined ? { source_file_name: body.source_file_name } : {}),
    ...(body.notes !== undefined ? { notes: body.notes || undefined } : {}),
  };

  const updated = await updateImportBatch(userId, id, patch);
  if (!updated) return NextResponse.json({ error: "Import batch not found" }, { status: 404 });

  return NextResponse.json({ success: true, import: updated });
}

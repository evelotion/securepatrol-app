import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getPrivateFotoUrl, isCloudinaryKeyForUser } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getCurrentUser();
  const { id } = await context.params;
  const foto = await prisma.foto.findUnique({
    where: { id },
    select: { key: true, userId: true },
  });

  if (!foto || foto.userId !== actor.id || !isCloudinaryKeyForUser(foto.key, actor.id)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.redirect(getPrivateFotoUrl(foto.key), {
    status: 302,
    headers: { "Cache-Control": "private, no-store" },
  });
}

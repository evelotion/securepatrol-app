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
    select: { key: true, userId: true, mime: true },
  });

  if (!foto || foto.userId !== actor.id || !isCloudinaryKeyForUser(foto.key, actor.id)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Streaming lewat route ini (bukan redirect) supaya header no-store benar-benar
  // berlaku — respons Cloudinary sendiri memakai Cache-Control publik.
  const upstream = await fetch(getPrivateFotoUrl(foto.key), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? foto.mime,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, { status: 200, headers });
}

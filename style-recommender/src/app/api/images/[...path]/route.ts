import { NextRequest, NextResponse } from "next/server";
import { readImage, imageExists } from "@/lib/storage";
import { getUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { path } = await params;
    const relativePath = path.join("/");

    // Prevent directory traversal
    if (relativePath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (!(await imageExists(relativePath))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { buffer, mimeType } = await readImage(relativePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}

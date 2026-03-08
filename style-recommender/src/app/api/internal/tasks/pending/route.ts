import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readImage } from "@/lib/storage";

function isWorkerAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return !!token && token === process.env.WORKER_TOKEN;
}

// GET — worker picks up next pending task
export async function GET(request: NextRequest) {
  if (!isWorkerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = await prisma.styleTask.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });

  if (!task) {
    return NextResponse.json(null);
  }

  // For image-based tasks, inject the base64 image data into the payload
  const payload = JSON.parse(task.payload);
  if (payload.imagePath) {
    try {
      const { buffer, mimeType } = await readImage(payload.imagePath);
      payload.imageBase64 = buffer.toString("base64");
      payload.mimeType = mimeType;
    } catch (err) {
      console.error("Failed to read image for task:", err);
    }
  }

  return NextResponse.json({
    id: task.id,
    type: task.type,
    payload,
    userId: task.userId,
    targetId: task.targetId,
  });
}

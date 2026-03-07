import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import ReactPDF from "@react-pdf/renderer";
import { StyleProfilePDF } from "@/components/pdf/StyleProfilePDF";

// GET — download style profile as PDF
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.styleProfile.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    if (!profile?.mergedProfile) {
      return NextResponse.json({ error: "No profile found. Complete the quiz first." }, { status: 404 });
    }

    const profileData = JSON.parse(profile.mergedProfile);

    const pdfStream = await ReactPDF.renderToStream(
      StyleProfilePDF({
        userName: user.name || user.email,
        profileData,
        colorSeason: profile.colorSeason,
        kibbeType: profile.kibbeType,
        styleArchetype: profile.styleArchetype,
      })
    );

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="style-profile-${user.name || "user"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

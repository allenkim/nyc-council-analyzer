import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { ProfileView } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await prisma.styleProfile.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  if (!profile?.mergedProfile) {
    redirect("/quiz");
  }

  let profileData: { claude?: Record<string, unknown>; gemini?: Record<string, unknown> };
  try {
    profileData = JSON.parse(profile.mergedProfile);
  } catch {
    redirect("/quiz");
  }

  return (
    <ProfileView
      userName={user.name || user.email}
      profileData={profileData}
      colorSeason={profile.colorSeason}
      kibbeType={profile.kibbeType}
      styleArchetype={profile.styleArchetype}
    />
  );
}

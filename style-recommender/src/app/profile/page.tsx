import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { ProfileView } from "@/components/profile/ProfileView";
import { ProfileGenerating } from "@/components/profile/ProfileGenerating";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/");

  // Check for completed profile
  const profile = await prisma.styleProfile.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  if (profile?.mergedProfile) {
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

  // No completed profile — check for a pending/processing task
  const pendingTask = await prisma.styleTask.findFirst({
    where: {
      userId: user.id,
      type: "profile_generation",
      status: { in: ["pending", "processing"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (pendingTask) {
    return (
      <ProfileGenerating
        taskId={pendingTask.id}
        taskStatus={pendingTask.status}
        taskCreatedAt={pendingTask.createdAt.toISOString()}
      />
    );
  }

  // Check for a recently failed task to show error with retry
  const failedTask = await prisma.styleTask.findFirst({
    where: {
      userId: user.id,
      type: "profile_generation",
      status: "failed",
    },
    orderBy: { createdAt: "desc" },
  });

  if (failedTask) {
    return (
      <ProfileGenerating
        taskId={failedTask.id}
        taskStatus="failed"
        taskCreatedAt={failedTask.createdAt.toISOString()}
      />
    );
  }

  // No profile, no task — redirect to quiz
  redirect("/quiz");
}

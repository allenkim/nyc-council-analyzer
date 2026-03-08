export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import FeedView from "@/components/feed/FeedView";

export default async function DiscoverPage() {
  const user = await getUser();
  if (!user) redirect("/style/login");

  // Check if user has a style profile — redirect to quiz if not
  const profile = await prisma.styleProfile.findFirst({
    where: { userId: user.id },
  });

  if (!profile?.mergedProfile) {
    redirect("/style/quiz");
  }

  // Fetch initial feed data
  const [unseenItems, savedItems, heartedItems] = await Promise.all([
    prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { some: { action: "save" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedItem.findMany({
      where: {
        userId: user.id,
        interactions: { some: { action: "heart" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Serialize dates to strings for client components
  const serialize = (items: typeof unseenItems) =>
    items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Discover</h1>
        <p className="text-sm text-gray-400 mt-1">
          AI-curated picks based on your style profile
        </p>
      </div>

      <FeedView
        initialUnseen={serialize(unseenItems)}
        initialSaved={serialize(savedItems)}
        initialHearted={serialize(heartedItems)}
      />
    </div>
  );
}

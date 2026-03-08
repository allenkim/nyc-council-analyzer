export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import QuizFlow from "@/components/quiz/QuizFlow";

export const metadata = {
  title: "Style Quiz | Style",
};

export default async function QuizPage() {
  const user = await getUser();
  if (!user) redirect("/");

  // Load existing quiz responses
  const quizResponses = await prisma.quizResponse.findMany({
    where: { userId: user.id },
  });

  // Build initial answers map: { body: { height: "5'10", ... }, lifestyle: { ... } }
  const initialAnswers: Record<string, Record<string, string | string[]>> = {};
  for (const response of quizResponses) {
    try {
      const parsed = JSON.parse(response.answers);
      initialAnswers[response.category] = parsed;
    } catch {
      // Skip malformed answers
    }
  }

  // Count existing selfies
  const selfieCount = await prisma.selfieUpload.count({
    where: { userId: user.id },
  });

  return (
    <main className="min-h-screen bg-gray-900">
      <QuizFlow
        initialAnswers={initialAnswers}
        initialSelfieCount={selfieCount}
      />
    </main>
  );
}

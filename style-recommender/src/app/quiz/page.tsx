import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import QuizFlow from "@/components/quiz/QuizFlow";

export const metadata = {
  title: "Style Quiz | Style",
};

export default async function QuizPage() {
  const user = await getUser();
  if (!user) redirect("/finance/login");

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

  // Check if user already has a selfie
  const selfie = await prisma.selfieUpload.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-900">
      <QuizFlow
        initialAnswers={initialAnswers}
        hasSelfie={!!selfie}
      />
    </main>
  );
}

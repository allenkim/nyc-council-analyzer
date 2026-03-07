import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import OutfitUpload from "@/components/check/OutfitUpload";
import FeedbackView from "@/components/check/FeedbackView";

function extractRating(feedback: string | null): number | null {
  if (!feedback) return null;
  try {
    const parsed = JSON.parse(feedback);
    return typeof parsed.rating === "number" ? parsed.rating : null;
  } catch {
    return null;
  }
}

export default async function OutfitCheckPage() {
  const user = await getUser();
  if (!user) redirect("/finance/login");

  const checks = await prisma.outfitCheck.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Outfit Check</h1>
        <p className="text-gray-500 mt-1">
          Upload an outfit photo and get feedback from two AI models.
        </p>
      </div>

      <OutfitUpload />

      {/* History */}
      {checks.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Past Checks</h2>
          <div className="space-y-6">
            {checks.map((check) => {
              const claudeRating = extractRating(check.feedbackClaude);
              const geminiRating = extractRating(check.feedbackGemini);

              return (
                <details key={check.id} className="group border rounded-xl overflow-hidden">
                  <summary className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://drive.google.com/uc?id=${check.driveFileId}`}
                      alt="Outfit"
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500">
                        {new Date(check.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      {claudeRating !== null && (
                        <span className="text-sm font-medium text-gray-600">
                          Claude: <span className="font-bold">{claudeRating}/10</span>
                        </span>
                      )}
                      {geminiRating !== null && (
                        <span className="text-sm font-medium text-gray-600">
                          Gemini: <span className="font-bold">{geminiRating}/10</span>
                        </span>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="p-4 pt-0 border-t">
                    <FeedbackView
                      feedbackClaude={check.feedbackClaude}
                      feedbackGemini={check.feedbackGemini}
                    />
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

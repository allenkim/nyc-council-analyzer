"use client";

interface OutfitFeedback {
  rating: number;
  ratingJustification: string;
  whatsWorking: string[];
  improvements: string[];
  fitAssessment: string;
  colorHarmony: string;
  swapSuggestions: { currentItem: string; suggestedSwap: string; reason: string }[];
}

function parseFeedback(raw: string | null): OutfitFeedback | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OutfitFeedback;
  } catch {
    return null;
  }
}

function RatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8
      ? "text-green-600 border-green-200 bg-green-50"
      : rating >= 5
        ? "text-amber-600 border-amber-200 bg-amber-50"
        : "text-red-600 border-red-200 bg-red-50";

  return (
    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 text-2xl font-bold ${color}`}>
      {rating}
    </div>
  );
}

function SingleFeedback({ feedback, modelName }: { feedback: OutfitFeedback; modelName: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <RatingBadge rating={feedback.rating} />
        <div>
          <p className="font-semibold text-lg">{modelName} says...</p>
          <p className="text-sm text-gray-500">{feedback.ratingJustification}</p>
        </div>
      </div>

      {feedback.whatsWorking.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
            What&apos;s Working
          </h4>
          <ul className="space-y-1">
            {feedback.whatsWorking.map((item, i) => (
              <li key={i} className="text-sm text-green-800 bg-green-50 rounded px-3 py-1.5">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Improvements
          </h4>
          <ul className="space-y-1">
            {feedback.improvements.map((item, i) => (
              <li key={i} className="text-sm text-amber-800 bg-amber-50 rounded px-3 py-1.5">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.fitAssessment && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Fit Assessment
          </h4>
          <p className="text-sm text-gray-600">{feedback.fitAssessment}</p>
        </div>
      )}

      {feedback.colorHarmony && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Color Harmony
          </h4>
          <p className="text-sm text-gray-600">{feedback.colorHarmony}</p>
        </div>
      )}

      {feedback.swapSuggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Swap Suggestions
          </h4>
          <div className="space-y-2">
            {feedback.swapSuggestions.map((swap, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                <p>
                  <span className="font-medium text-gray-700">{swap.currentItem}</span>
                  {" "}
                  <span className="text-gray-400">&rarr;</span>
                  {" "}
                  <span className="font-medium text-blue-700">{swap.suggestedSwap}</span>
                </p>
                <p className="text-gray-500 mt-1">{swap.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FeedbackViewProps {
  feedbackClaude: string | null;
  feedbackGemini: string | null;
}

export default function FeedbackView({ feedbackClaude, feedbackGemini }: FeedbackViewProps) {
  const claude = parseFeedback(feedbackClaude);
  const gemini = parseFeedback(feedbackGemini);

  if (!claude && !gemini) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No feedback available. Both models failed to analyze this outfit.</p>
      </div>
    );
  }

  // Only one model succeeded
  if (!claude || !gemini) {
    const feedback = claude || gemini!;
    const name = claude ? "Claude" : "Gemini";
    return (
      <div className="border rounded-xl p-6">
        <SingleFeedback feedback={feedback} modelName={name} />
        <p className="text-xs text-gray-400 mt-4">
          Note: Only {name} returned feedback for this check.
        </p>
      </div>
    );
  }

  // Both models succeeded — side by side
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-xl p-6">
        <SingleFeedback feedback={claude} modelName="Claude" />
      </div>
      <div className="border rounded-xl p-6">
        <SingleFeedback feedback={gemini} modelName="Gemini" />
      </div>
    </div>
  );
}

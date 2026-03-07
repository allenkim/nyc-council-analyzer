"use client";

import type { QuizQuestion } from "@/lib/quiz-definitions";
import VisualGrid from "./VisualGrid";

interface QuizSectionProps {
  questions: QuizQuestion[];
  answers: Record<string, string | string[]>;
  onChange: (questionId: string, value: string | string[]) => void;
}

export default function QuizSection({ questions, answers, onChange }: QuizSectionProps) {
  return (
    <div className="space-y-8">
      {questions.map((q) => (
        <div key={q.id}>
          <label className="block text-lg font-medium text-gray-100 mb-3">
            {q.question}
          </label>

          {q.type === "select" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isChecked = answers[q.id] === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-indigo-600/20 border border-indigo-500"
                        : "bg-gray-800 border border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.value}
                      checked={isChecked}
                      onChange={() => onChange(q.id, opt.value)}
                      className="w-4 h-4 text-indigo-500 bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-gray-200">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === "multiselect" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const selectedArr = (answers[q.id] as string[] | undefined) || [];
                const isChecked = selectedArr.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-indigo-600/20 border border-indigo-500"
                        : "bg-gray-800 border border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? selectedArr.filter((v) => v !== opt.value)
                          : [...selectedArr, opt.value];
                        onChange(q.id, next);
                      }}
                      className="w-4 h-4 text-indigo-500 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-gray-200">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {(q.type === "text" || q.type === "number") && (
            <input
              type={q.type}
              placeholder={q.placeholder}
              value={(answers[q.id] as string) || ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          )}

          {q.type === "visual-grid" && q.options && (
            <VisualGrid
              options={q.options}
              selected={(answers[q.id] as string[] | undefined) || []}
              onChange={(selected) => onChange(q.id, selected)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

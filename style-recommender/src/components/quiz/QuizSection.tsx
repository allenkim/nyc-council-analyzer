"use client";

import type { QuizQuestion } from "@/lib/quiz-definitions";
import VisualGrid from "./VisualGrid";
import StyleDiscovery from "./StyleDiscovery";

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
          <label className="block text-lg font-medium text-zinc-100 mb-3">
            {q.question}
          </label>

          {q.type === "select" && q.options && q.options.length > 10 && (
            <select
              value={(answers[q.id] as string) || ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="" disabled>Select...</option>
              {q.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {q.type === "select" && q.options && q.options.length <= 10 && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isChecked = answers[q.id] === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-indigo-600/20 border border-indigo-500"
                        : "bg-zinc-800 border border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.value}
                      checked={isChecked}
                      onChange={() => onChange(q.id, opt.value)}
                      className="w-4 h-4 text-indigo-500 bg-zinc-700 border-zinc-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                    />
                    <span className="text-zinc-200">{opt.label}</span>
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
                        : "bg-zinc-800 border border-zinc-700 hover:border-zinc-500"
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
                      className="w-4 h-4 text-indigo-500 bg-zinc-700 border-zinc-600 rounded focus:ring-indigo-500 focus:ring-offset-zinc-900"
                    />
                    <span className="text-zinc-200">{opt.label}</span>
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
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          )}

          {q.type === "visual-grid" && q.options && (
            <VisualGrid
              questionId={q.id}
              options={q.options}
              selected={(answers[q.id] as string[] | undefined) || []}
              onChange={(selected) => onChange(q.id, selected)}
            />
          )}

          {q.type === "style-discovery" && (
            <StyleDiscovery
              onChange={(value) => onChange(q.id, value)}
              initialValue={answers[q.id] as string | undefined}
            />
          )}
        </div>
      ))}
    </div>
  );
}

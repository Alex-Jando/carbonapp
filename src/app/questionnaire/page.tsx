"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";

import { QUESTIONNAIRE_V1, QuestionDef } from "../../questionnaire";

type AnswerValue = boolean | number | string;

type SubmitResponse = {
  ok?: boolean;
  initialFootprintKg?: number;
  error?: string;
};

type ProfileResponse = {
  initialFootprintKg: number | null;
  error?: string;
};

function sectionTitle(section: string) {
  if (section === "transportation") return "Transportation";
  if (section === "home_energy") return "Home Energy";
  if (section === "diet") return "Diet";
  if (section === "consumption_habits") return "Consumption Habits";
  if (section === "waste") return "Waste";
  return section;
}

function splitOptionLabel(option: string): {
  title: string;
  description?: string;
} {
  const m = option.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (!m) return { title: option };
  const title = (m[1] ?? "").trim();
  const description = (m[2] ?? "").trim();
  return { title: title || option, description: description || undefined };
}

// If one option has a description, we ensure *all* options show a description line.
// For options without (), we generate a neutral short descriptor.
function normalizeOptions(
  options: string[] | undefined,
): Array<{ key: string; title: string; description: string }> {
  const opts = options ?? [];
  const split = opts.map((o) => ({ raw: o, ...splitOptionLabel(o) }));
  const anyHasDesc = split.some((o) => !!o.description);

  return split.map((o) => {
    if (anyHasDesc) {
      // Generate a small neutral description if missing.
      const desc =
        o.description?.trim() ||
        // lightweight, non-judgmental placeholder descriptor
        "Tap to choose";
      return { key: o.raw, title: o.title, description: desc };
    }
    // If none have descriptions, still keep a consistent two-line layout:
    // Use an empty-ish line (non-breaking space) via a subtle placeholder.
    return { key: o.raw, title: o.title, description: " " };
  });
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleAuthFailure() {
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem("auth_local_id");
    router.replace("/login");
  }

  useEffect(() => {
    const idToken = localStorage.getItem("auth_id_token");
    const localId = localStorage.getItem("auth_local_id");
    if (!idToken || !localId) {
      router.replace("/login");
      return;
    }

    const loadProfile = async () => {
      const res = await fetch(
        `/api/profile?localId=${encodeURIComponent(localId)}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      if (res.status === 401) {
        handleAuthFailure();
        return;
      }
      const data = (await res.json()) as ProfileResponse;
      if (res.ok && data.initialFootprintKg && data.initialFootprintKg > 0) {
        router.replace("/home");
      }
    };

    void loadProfile();
  }, [router]);

  const sections = useMemo(() => {
    const map = new Map<string, QuestionDef[]>();
    for (const q of QUESTIONNAIRE_V1.questions) {
      if (!map.has(q.section)) map.set(q.section, []);
      map.get(q.section)?.push(q);
    }
    return Array.from(map.entries());
  }, []);

  function updateAnswer(id: string, value: AnswerValue | null) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === null || value === "") delete next[id];
      else next[id] = value;
      return next;
    });
  }

  function validateAllQuestionsAnswered() {
    const missing: string[] = [];
    for (const q of QUESTIONNAIRE_V1.questions) {
      const val = answers[q.id];
      const hasValue =
        val !== undefined &&
        val !== null &&
        !(typeof val === "string" && val.trim() === "");
      if (!hasValue) missing.push(q.id);
    }
    return missing;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const missing = validateAllQuestionsAnswered();
    if (missing.length > 0) {
      setError("Please answer all questions before submitting.");
      const first = document.querySelector(`[data-qid="${missing[0]}"]`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);

    const idToken = localStorage.getItem("auth_id_token");
    if (!idToken) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch("/api/questionnaire/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          questionnaireVersion: "v1",
          answers,
        }),
      });

      if (res.status === 401) {
        handleAuthFailure();
        return;
      }

      const data = (await res.json()) as SubmitResponse;
      if (!res.ok) {
        setError(data.error ?? "Failed to submit questionnaire.");
        return;
      }

      router.push("/home");
    } catch {
      setError("Failed to submit questionnaire.");
    } finally {
      setLoading(false);
    }
  }

  function ChoiceButton({
    selected,
    onClick,
    title,
    description,
  }: {
    selected: boolean;
    onClick: () => void;
    title: string;
    description: string; // always present for consistent height
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={[
          // sizing: consistent height/width
          "w-full sm:w-[240px] md:w-[260px] lg:w-[280px]",
          "min-h-[64px]",
          "rounded-xl border px-4 py-3 text-left transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
          "whitespace-normal",
          selected
            ? "border-emerald-400/55 bg-emerald-500/18 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
            : "border-white/10 bg-black/30 text-zinc-200 hover:border-white/20 hover:bg-black/40",
        ].join(" ")}
      >
        <div className="flex h-full flex-col justify-center">
          <div className="font-medium leading-tight text-white">{title}</div>
          <div className="mt-1 text-xs leading-snug text-zinc-400">
            {description}
          </div>
        </div>
      </button>
    );
  }

  return (
    <main className="relative min-h-dvh bg-zinc-950 text-white">
      {/* 🌿 Strong green ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute -bottom-48 right-[-140px] h-[520px] w-[520px] rounded-full bg-lime-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,rgba(16,185,129,0.22),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 text-3xl font-semibold tracking-tight"
        >
          Initial Carbon Footprint
        </motion.h1>

        <p className="mb-8 text-zinc-300">
          Please complete this questionnaire before continuing.
        </p>

        {error ? (
          <Alert className="mb-6 border-rose-500/40 bg-rose-500/15 text-white">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-8">
          {sections.map(([section, questions]) => (
            <Card
              key={section}
              className="border-white/10 bg-white/[0.06] backdrop-blur"
            >
              <CardHeader>
                <CardTitle className="text-white text-2xl">
                  {sectionTitle(section)}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-10">
                {questions.map((q) => {
                  const current = answers[q.id];

                  return (
                    <div key={q.id} data-qid={q.id} className="space-y-5">
                      <Label className="block text-zinc-200 text-lg">
                        {q.prompt}
                      </Label>

                      {/* NUMBER: always controlled */}
                      {q.type === "number"
                        ? (() => {
                            const inputValue =
                              typeof current === "number" &&
                              Number.isFinite(current)
                                ? String(current)
                                : "";

                            return (
                              <div className="mt-1">
                                <Input
                                  type="number"
                                  step="any"
                                  inputMode="decimal"
                                  value={inputValue}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === "") {
                                      updateAnswer(q.id, null);
                                      return;
                                    }
                                    const n = Number(raw);
                                    updateAnswer(
                                      q.id,
                                      Number.isFinite(n) ? n : null,
                                    );
                                  }}
                                  className="h-12 border-white/10 bg-black/30 text-white text-lg placeholder:text-zinc-400 focus-visible:ring-emerald-400/60"
                                />
                              </div>
                            );
                          })()
                        : null}

                      {/* BOOLEAN: consistent height, consistent width, centered layout */}
                      {q.type === "boolean" ? (
                        <div className="flex flex-wrap justify-center gap-3">
                          <ChoiceButton
                            selected={current === true}
                            onClick={() => updateAnswer(q.id, true)}
                            title="Yes"
                            description="Confirm this applies"
                          />
                          <ChoiceButton
                            selected={current === false}
                            onClick={() => updateAnswer(q.id, false)}
                            title="No"
                            description="Does not apply"
                          />
                        </div>
                      ) : null}

                      {/* SINGLE: neat, same-sized options, centered */}
                      {q.type === "single" ? (
                        <div className="flex flex-wrap justify-center gap-3">
                          {normalizeOptions(q.options).map((opt) => (
                            <ChoiceButton
                              key={opt.key}
                              selected={current === opt.key}
                              onClick={() => updateAnswer(q.id, opt.key)}
                              title={opt.title}
                              description={opt.description}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-gradient-to-r from-emerald-400 to-lime-300 text-white shadow-[0_18px_55px_rgba(16,185,129,0.28)] hover:brightness-105"
          >
            {loading ? "Submitting..." : "Submit Questionnaire"}
          </Button>
        </form>
      </div>
    </main>
  );
}

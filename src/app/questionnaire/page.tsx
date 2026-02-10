"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONNAIRE_V1, QuestionDef } from "../../questionnaire";
import { AppLogo } from "@/src/components/brand/AppLogo";

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

type SectionKey =
  | "transportation"
  | "home_energy"
  | "diet"
  | "consumption_habits"
  | "waste";

const SECTION_TITLES: Record<SectionKey, string> = {
  transportation: "Transportation",
  home_energy: "Home Energy",
  diet: "Diet",
  consumption_habits: "Consumption Habits",
  waste: "Waste",
};

const SECTION_ORDER: SectionKey[] = [
  "transportation",
  "home_energy",
  "diet",
  "consumption_habits",
  "waste",
];

function rangeForQuestion(id: string, units?: string) {
  if (units === "days_per_week") return { min: 0, max: 7, step: 1 };
  if (units === "trips_per_day") return { min: 0, max: 10, step: 1 };
  if (units === "trips_per_month") return { min: 0, max: 40, step: 1 };
  if (units === "round_trips_per_year") return { min: 0, max: 20, step: 1 };
  if (units === "hours") return { min: 0, max: 20, step: 0.5 };
  if (units === "miles_or_km_per_week") return { min: 0, max: 800, step: 5 };
  if (id.includes("per_week")) return { min: 0, max: 100, step: 1 };
  return { min: 0, max: 100, step: 1 };
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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
      const res = await fetch(`/api/profile?localId=${encodeURIComponent(localId)}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.status === 401) {
        handleAuthFailure();
        return;
      }
      const data = (await res.json()) as ProfileResponse;
      if (res.ok && data.initialFootprintKg !== null && data.initialFootprintKg > 0) {
        router.replace("/home");
      }
    };

    void loadProfile();
  }, [router]);

  useEffect(() => {
    const updates: string[] = [];
    if (answers["q_transport_car_own"] !== true) {
      updates.push(
        "q_transport_km_per_week",
        "q_transport_fuel_type",
        "q_transport_vehicle_age",
        "q_transport_carpool_frequency"
      );
    }
    const publicDays = answers["q_transport_public_transport_days_per_week"];
    if (!(typeof publicDays === "number" && publicDays > 0)) {
      updates.push("q_transport_public_transport_trips_per_day", "q_transport_public_transport_type");
    }
    const flightsPerYear = answers["q_transport_flights_per_year"];
    if (!(typeof flightsPerYear === "number" && flightsPerYear > 0)) {
      updates.push("q_transport_flight_duration_hours", "q_transport_flight_class");
    }
    const meatFrequency = answers["q_diet_meat_frequency"];
    if (meatFrequency === "Never (vegetarian/vegan)") {
      updates.push("q_diet_primary_meat_type");
    }

    if (updates.length > 0) {
      setAnswers((prev) => {
        const next = { ...prev };
        for (const id of updates) {
          delete next[id];
        }
        return next;
      });
    }
  }, [
    answers["q_transport_car_own"],
    answers["q_transport_public_transport_days_per_week"],
    answers["q_transport_flights_per_year"],
    answers["q_diet_meat_frequency"]
  ]);

  const sections = useMemo(() => {
    const map = new Map<string, QuestionDef[]>();
    for (const question of QUESTIONNAIRE_V1.questions) {
      if (!map.has(question.section)) {
        map.set(question.section, []);
      }
      map.get(question.section)?.push(question);
    }
    return Array.from(map.entries()) as Array<[SectionKey, QuestionDef[]]>;
  }, []);

  function updateAnswer(id: string, value: AnswerValue | null) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === null || value === "") {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  }

  function shouldShowQuestion(questionId: string) {
    const carOwns = answers["q_transport_car_own"];
    if (
      (questionId === "q_transport_km_per_week" ||
        questionId === "q_transport_fuel_type" ||
        questionId === "q_transport_vehicle_age" ||
        questionId === "q_transport_carpool_frequency") &&
      carOwns !== true
    ) {
      return false;
    }

    const publicDays = answers["q_transport_public_transport_days_per_week"];
    if (
      (questionId === "q_transport_public_transport_trips_per_day" ||
        questionId === "q_transport_public_transport_type") &&
      !(typeof publicDays === "number" && publicDays > 0)
    ) {
      return false;
    }

    const flightsPerYear = answers["q_transport_flights_per_year"];
    if (
      (questionId === "q_transport_flight_duration_hours" ||
        questionId === "q_transport_flight_class") &&
      !(typeof flightsPerYear === "number" && flightsPerYear > 0)
    ) {
      return false;
    }

    const meatFrequency = answers["q_diet_meat_frequency"];
    if (
      questionId === "q_diet_primary_meat_type" &&
      meatFrequency === "Never (vegetarian/vegan)"
    ) {
      return false;
    }

    return true;
  }

  function isQuestionAnswered(question: QuestionDef) {
    if (!shouldShowQuestion(question.id)) return true;
    const value = answers[question.id];
    if (question.type === "number") {
      if (value === undefined) return true;
      return typeof value === "number" && Number.isFinite(value);
    }
    if (question.type === "boolean") {
      return typeof value === "boolean";
    }
    if (question.type === "single") {
      return typeof value === "string" && value.length > 0;
    }
    return false;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const idToken = localStorage.getItem("auth_id_token");
    const localId = localStorage.getItem("auth_local_id");
    if (!idToken || !localId) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch("/api/questionnaire/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          questionnaireVersion: "v1",
          answers
        })
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

  const activeSection = SECTION_ORDER[activeIndex];
  const activeQuestions = sections.find(([key]) => key === activeSection)?.[1] ?? [];
  const completedSections = SECTION_ORDER.slice(0, activeIndex);
  const activeShownQuestions = activeQuestions.filter((question) =>
    shouldShowQuestion(question.id)
  );
  const activeRequiredComplete = activeShownQuestions.every((question) =>
    isQuestionAnswered(question)
  );
  const allRequiredComplete = sections.every(([, questions]) =>
    questions
      .filter((question) => shouldShowQuestion(question.id))
      .every((question) => isQuestionAnswered(question))
  );

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center gap-3">
            <AppLogo
              size={38}
              imageClassName="drop-shadow-[0_14px_24px_rgba(16,185,129,0.2)]"
            />
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Initial Assessment
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold">Carbon Footprint Survey</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Answer a few quick questions to personalize your daily tasks.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {SECTION_ORDER.map((section, index) => {
            const isActive = index === activeIndex;
            const isDone = completedSections.includes(section);
            return (
              <button
                type="button"
                key={section}
                onClick={() => setActiveIndex(index)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-emerald-400 text-white"
                    : isDone
                    ? "border border-emerald-400/40 text-emerald-200"
                    : "border border-white/10 text-zinc-400"
                }`}
              >
                {SECTION_TITLES[section]}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {SECTION_TITLES[activeSection]}
                </h2>
                <p className="text-sm text-zinc-400">
                  Step {activeIndex + 1} of {SECTION_ORDER.length}
                </p>
              </div>
              <div className="text-xs text-zinc-400">
                {Math.round(((activeIndex + 1) / SECTION_ORDER.length) * 100)}%
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {activeQuestions.map((question) =>
                shouldShowQuestion(question.id) ? (
                  <div key={question.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white">{question.prompt}</p>
                    {question.type === "number" ? (
                      <NumberSlider
                        question={question}
                        value={typeof answers[question.id] === "number" ? (answers[question.id] as number) : 0}
                        onChange={(value) => updateAnswer(question.id, value)}
                      />
                    ) : null}
                    {question.type === "boolean" ? (
                      <OptionButtons
                        options={["Yes", "No"]}
                        value={answers[question.id] === true ? "Yes" : answers[question.id] === false ? "No" : null}
                        onChange={(value) =>
                          updateAnswer(question.id, value === "Yes" ? true : false)
                        }
                      />
                    ) : null}
                    {question.type === "single" ? (
                      <OptionButtons
                        options={question.options ?? []}
                        value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : null}
                        onChange={(value) => updateAnswer(question.id, value)}
                      />
                    ) : null}
                  </div>
                ) : null
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              Back
            </button>
            {activeIndex < SECTION_ORDER.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => Math.min(prev + 1, SECTION_ORDER.length - 1))}
                disabled={!activeRequiredComplete}
                className={`rounded-full px-6 py-2 text-sm font-semibold ${
                  activeRequiredComplete
                    ? "bg-emerald-400 text-white"
                    : "bg-white/10 text-zinc-500"
                }`}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !allRequiredComplete}
                className={`rounded-full px-6 py-2 text-sm font-semibold ${
                  loading || !allRequiredComplete
                    ? "bg-white/10 text-zinc-500"
                    : "bg-emerald-400 text-white"
                }`}
              >
                {loading ? "Submitting..." : "Submit Survey"}
              </button>
            )}
          </div>

          {!allRequiredComplete ? (
            <p className="text-sm text-amber-300">
              Please answer all required questions before submitting.
            </p>
          ) : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}

function NumberSlider({
  question,
  value,
  onChange,
}: {
  question: QuestionDef;
  value: number;
  onChange: (value: number) => void;
}) {
  const range = rangeForQuestion(question.id, question.units);
  const displayValue = Number.isFinite(value) ? value : range.min;

  useEffect(() => {
    if (!Number.isFinite(value)) {
      onChange(range.min);
    }
  }, [value, range.min, onChange]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{range.min}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {displayValue}
        </span>
        <span>{range.max}</span>
      </div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={displayValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className="slider-orb"
      />
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span>Exact value:</span>
        <input
          type="number"
          min={range.min}
          max={range.max}
          step={range.step}
          value={displayValue}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-zinc-100"
        />
      </div>
    </div>
  );
}

function OptionButtons({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              active
                ? "bg-emerald-400 text-white"
                : "border border-white/10 text-zinc-300 hover:border-emerald-400/40"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
    return Array.from(map.entries());
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

  return (
    <main>
      <h1>Initial Carbon Footprint Questionnaire</h1>
      <p>Please complete this questionnaire before continuing.</p>
      <form onSubmit={handleSubmit}>
        {sections.map(([section, questions]) => (
          <section key={section}>
            <h2>{sectionTitle(section)}</h2>
            {questions.map((question) => (
              shouldShowQuestion(question.id) ? (
                <div key={question.id}>
                  <label>
                    {question.prompt}
                    {question.type === "number" ? (
                      <input
                        type="number"
                        step="any"
                        required
                        onChange={(event) => {
                          const value = event.target.value;
                          updateAnswer(question.id, value === "" ? null : Number(value));
                        }}
                      />
                    ) : null}
                    {question.type === "boolean" ? (
                      <select
                        defaultValue=""
                        required
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === "true") updateAnswer(question.id, true);
                          else if (value === "false") updateAnswer(question.id, false);
                          else updateAnswer(question.id, null);
                        }}
                      >
                        <option value="">Select</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : null}
                    {question.type === "single" ? (
                      <select
                        defaultValue=""
                        required
                        onChange={(event) => {
                          const value = event.target.value;
                          updateAnswer(question.id, value === "" ? null : value);
                        }}
                      >
                        <option value="">Select</option>
                        {question.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </label>
                </div>
              ) : null
            ))}
          </section>
        ))}
        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Questionnaire"}
        </button>
      </form>
      {error ? <p>{error}</p> : null}
    </main>
  );
}

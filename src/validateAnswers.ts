import type { QuestionDef, QuestionnaireDef } from "./questionnaire";

export type AnswerValue = boolean | number | string;

export type ValidatedAnswers = Record<string, AnswerValue>;

export type ValidateAnswersResult = {
  validAnswers: ValidatedAnswers;
  missingQuestionIds: string[];
};

const DEFAULT_ANSWERS: ValidatedAnswers = {
  q_transport_car_own: false,
  q_transport_km_per_week: 0,
  q_transport_fuel_type: "Gasoline/Petrol",
  q_transport_vehicle_age: "8-12 years old (average efficiency)",
  q_transport_carpool_frequency: "Never",
  q_transport_walk_cycle_days_per_week: 0,
  q_transport_public_transport_days_per_week: 0,
  q_transport_public_transport_trips_per_day: 0,
  q_transport_public_transport_type: "Bus",
  q_transport_rideshare_trips_per_month: 0,
  q_transport_flights_per_year: 0,
  q_transport_flight_duration_hours: 0,
  q_transport_flight_class: "Economy",
  q_home_size: "Medium (2-3 bedroom, 50-100 mÂ² / 500-1000 sq ft)",
  q_home_electricity_usage: "Average (typical household usage)",
  q_home_appliance_efficiency: "Mix of efficient and older appliances",
  q_home_renewable_energy: "No, standard grid energy",
  q_home_heating_source: "Natural gas",
  q_home_heating_cooling_usage: "Moderate (comfortable temperatures, some conservation)",
  q_home_insulation: "Moderately insulated",
  q_home_water_heater_type: "Natural gas",
  q_home_lighting_type: "Mix of LED and CFL",
  q_diet_meat_frequency: "A few times per week",
  q_diet_primary_meat_type: "Mix of different meats",
  q_diet_dairy_eggs_frequency: "A few times per week",
  q_diet_seafood_frequency: "Rarely",
  q_diet_plant_based_ratio: "About half",
  q_diet_local_organic_ratio: "Some local/organic (20-50%)",
  q_diet_food_waste: "Some waste (occasionally throw away leftovers)",
  q_consumption_new_items_frequency: "Occasionally (a few times per year)",
  q_consumption_shopping_mode: "Mix of online and in-store",
  q_consumption_electronics_frequency: "Occasionally (every 3-4 years)",
  q_consumption_fast_fashion_frequency: "Occasionally (a few items per year)",
  q_consumption_furniture_frequency: "Occasionally (every few years)",
  q_consumption_packaging_awareness: "Somewhat aware (occasionally choose less packaging)",
  q_waste_recycle_level: "Moderate (recycle common items like paper, plastic, glass)",
  q_waste_compost_frequency: "Occasionally",
  q_waste_single_use_frequency: "Occasionally",
  q_waste_electronics_disposal: "Sometimes recycle, sometimes trash",
  q_waste_plastic_use: "Moderate (some plastic, try to reduce)",
  q_waste_paper_use: "Moderate (some printing, but try to reduce)"
};

export class AnswerValidationError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[]) {
    super(message);
    this.name = "AnswerValidationError";
    this.details = details;
  }
}

function validateAnswerValue(question: QuestionDef, value: unknown): value is AnswerValue {
  if (question.type === "boolean") {
    return typeof value === "boolean";
  }

  if (question.type === "number") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  if (question.type === "single") {
    return typeof value === "string" && Array.isArray(question.options) && question.options.includes(value);
  }

  return false;
}

export function validateAnswers(
  questionnaire: QuestionnaireDef,
  answers: Record<string, unknown>
): ValidateAnswersResult {
  const questionById = new Map(questionnaire.questions.map((question) => [question.id, question]));
  const errors: string[] = [];
  const validAnswers: ValidatedAnswers = {};

  for (const [answerId, value] of Object.entries(answers)) {
    const question = questionById.get(answerId);
    if (!question) {
      errors.push(`Unknown questionId: ${answerId}`);
      continue;
    }

    if (!validateAnswerValue(question, value)) {
      errors.push(`Invalid answer for questionId: ${answerId}`);
      continue;
    }

    validAnswers[answerId] = value;
  }

  if (errors.length > 0) {
    throw new AnswerValidationError("Answer validation failed.", errors);
  }

  const missingQuestionIds = questionnaire.questions
    .map((question) => question.id)
    .filter((questionId) => !(questionId in validAnswers));

  if (missingQuestionIds.length > 0) {
    for (const questionId of missingQuestionIds) {
      if (questionId in DEFAULT_ANSWERS) {
        validAnswers[questionId] = DEFAULT_ANSWERS[questionId];
      }
    }
  }

  return { validAnswers, missingQuestionIds };
}

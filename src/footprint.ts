import type { ValidatedAnswers } from "./validateAnswers";

export type CalculatorInput = {
  transport: {
    kmDrivenPerWeek: number;
    carType: "gas" | "hybrid" | "electric" | "none";
  };
  home: {
    electricityKwhPerMonth: number;
  };
  diet: {
    meatServingsPerWeek: number;
  };
};

export type FootprintBreakdown = {
  transportKg: number;
  homeKg: number;
  dietKg: number;
};

export type FootprintResult = {
  totalKgPerYear: number;
  breakdown: FootprintBreakdown;
};

export type FootprintMappingResult = {
  calculatorInput: CalculatorInput;
  assumptions: string[];
};

const TRANSPORT_FACTORS: Record<CalculatorInput["transport"]["carType"], number> = {
  gas: 0.192,
  hybrid: 0.12,
  electric: 0.05,
  none: 0
};

const ELECTRICITY_FACTOR_KG_PER_KWH = 0.4;
const MEAT_FACTOR_KG_PER_SERVING = 5;

const FLIGHT_CLASS_FACTORS: Record<string, number> = {
  "Economy": 1,
  "Premium Economy": 1.2,
  "Business": 1.8,
  "First Class": 2.4
};

const KM_PER_FLIGHT_HOUR = 800;

const ELECTRICITY_KWH_BY_BUCKET: Record<string, number> = {
  "Very low (minimal appliances, LED lights, unplug when not in use)": 120,
  "Low (energy-efficient appliances, mindful usage)": 220,
  "Average (typical household usage)": 350,
  "High (many devices, always on, older appliances)": 550
};

const MEAT_SERVINGS_BY_FREQUENCY: Record<string, number> = {
  "Multiple times per day": 14,
  "Once per day": 7,
  "A few times per week": 3,
  "Rarely (once per month or less)": 0.25,
  "Never (vegetarian/vegan)": 0
};

const MEAT_TYPE_MULTIPLIER: Record<string, number> = {
  "Beef (highest emissions)": 1.4,
  "Pork": 1.0,
  "Lamb": 1.3,
  "Chicken/Turkey (lower emissions)": 0.7,
  "Mix of different meats": 1.0
};

function getNumber(answers: ValidatedAnswers, id: string, fallback: number, assumptions: string[]): number {
  const value = answers[id];
  if (typeof value !== "number") {
    assumptions.push(`${id} missing; defaulted to ${fallback}.`);
    return fallback;
  }
  return value;
}

function getString(answers: ValidatedAnswers, id: string, fallback: string, assumptions: string[]): string {
  const value = answers[id];
  if (typeof value !== "string") {
    assumptions.push(`${id} missing; defaulted to '${fallback}'.`);
    return fallback;
  }
  return value;
}

export function mapAnswersToFootprintInput(answers: ValidatedAnswers): FootprintMappingResult {
  const assumptions: string[] = [];

  const weeklyDrivenKm = getNumber(answers, "q_transport_km_per_week", 0, assumptions);
  const fuelTypeRaw = getString(answers, "q_transport_fuel_type", "Gasoline/Petrol", assumptions);
  const electricityBucket = getString(
    answers,
    "q_home_electricity_usage",
    "Average (typical household usage)",
    assumptions
  );
  const meatFrequency = getString(
    answers,
    "q_diet_meat_frequency",
    "A few times per week",
    assumptions
  );
  const primaryMeatType = getString(
    answers,
    "q_diet_primary_meat_type",
    "Mix of different meats",
    assumptions
  );

  const flightsPerYear = getNumber(answers, "q_transport_flights_per_year", 0, assumptions);
  const avgFlightHours = getNumber(answers, "q_transport_flight_duration_hours", 0, assumptions);
  const flightClass = getString(answers, "q_transport_flight_class", "Economy", assumptions);
  const classFactor = FLIGHT_CLASS_FACTORS[flightClass] ?? 1;
  if (!(flightClass in FLIGHT_CLASS_FACTORS)) {
    assumptions.push(`q_transport_flight_class '${flightClass}' unsupported; defaulted to 'Economy' multiplier.`);
  }

  const flightKmPerYear = flightsPerYear * 2 * avgFlightHours * KM_PER_FLIGHT_HOUR * classFactor;
  const flightKmPerWeek = flightKmPerYear / 52;
  const totalTransportKmPerWeek = weeklyDrivenKm + flightKmPerWeek;

  let carType: CalculatorInput["transport"]["carType"] = "gas";
  if (fuelTypeRaw === "Gasoline/Petrol") {
    carType = "gas";
  } else if (fuelTypeRaw === "Diesel") {
    carType = "gas";
    assumptions.push("q_transport_fuel_type 'Diesel' mapped to gas factor.");
  } else if (fuelTypeRaw === "Hybrid (gasoline)" || fuelTypeRaw === "Plug-in Hybrid") {
    carType = "hybrid";
  } else if (fuelTypeRaw === "Electric") {
    carType = "electric";
  } else {
    carType = "none";
    assumptions.push(`q_transport_fuel_type '${fuelTypeRaw}' unsupported; defaulted to 'none'.`);
  }

  const electricityKwhPerMonth = ELECTRICITY_KWH_BY_BUCKET[electricityBucket];
  if (electricityKwhPerMonth === undefined) {
    assumptions.push(`q_home_electricity_usage '${electricityBucket}' unsupported; defaulted to average usage.`);
  }

  const servingsBase = MEAT_SERVINGS_BY_FREQUENCY[meatFrequency];
  if (servingsBase === undefined) {
    assumptions.push(`q_diet_meat_frequency '${meatFrequency}' unsupported; defaulted to 3 servings/week.`);
  }

  const meatTypeMultiplier = MEAT_TYPE_MULTIPLIER[primaryMeatType];
  if (meatTypeMultiplier === undefined) {
    assumptions.push(`q_diet_primary_meat_type '${primaryMeatType}' unsupported; defaulted to mixed-meat factor.`);
  }

  const meatServingsPerWeek =
    (servingsBase ?? 3) * (meatTypeMultiplier ?? 1.0);

  return {
    calculatorInput: {
      transport: {
        kmDrivenPerWeek: totalTransportKmPerWeek,
        carType
      },
      home: {
        electricityKwhPerMonth: electricityKwhPerMonth ?? ELECTRICITY_KWH_BY_BUCKET["Average (typical household usage)"]
      },
      diet: {
        meatServingsPerWeek
      }
    },
    assumptions
  };
}

export function calculateFootprint(answers: CalculatorInput): FootprintResult {
  const yearlyKmDriven = answers.transport.kmDrivenPerWeek * 52;
  const yearlyKwh = answers.home.electricityKwhPerMonth * 12;
  const yearlyMeatServings = answers.diet.meatServingsPerWeek * 52;

  const transportKg = yearlyKmDriven * TRANSPORT_FACTORS[answers.transport.carType];
  const homeKg = yearlyKwh * ELECTRICITY_FACTOR_KG_PER_KWH;
  const dietKg = yearlyMeatServings * MEAT_FACTOR_KG_PER_SERVING;

  const totalKgPerYear = transportKg + homeKg + dietKg;

  return {
    totalKgPerYear,
    breakdown: {
      transportKg,
      homeKg,
      dietKg
    }
  };
}

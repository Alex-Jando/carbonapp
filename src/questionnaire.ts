export type QuestionType = "boolean" | "number" | "single";

export type QuestionDef = {
  id: string;
  section: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
  units?: string;
};

export type QuestionnaireDef = {
  version: "v1";
  questions: QuestionDef[];
};

export const QUESTIONNAIRE_V1: QuestionnaireDef = {
  version: "v1",
  questions: [
    { id: "q_transport_car_own", section: "transportation", prompt: "Do you own or regularly use a car? (yes/no)", type: "boolean" },
    { id: "q_transport_km_per_week", section: "transportation", prompt: "How many miles/kilometers do you drive per week?", type: "number", units: "miles_or_km_per_week" },
    { id: "q_transport_fuel_type", section: "transportation", prompt: "What type of fuel does your car use?", type: "single", options: ["Gasoline/Petrol", "Diesel", "Hybrid (gasoline)", "Electric", "Plug-in Hybrid"] },
    { id: "q_transport_vehicle_age", section: "transportation", prompt: "How old is your primary vehicle?", type: "single", options: ["Less than 3 years old (very efficient)", "3-7 years old (moderately efficient)", "8-12 years old (average efficiency)", "More than 12 years old (less efficient)"] },
    { id: "q_transport_carpool_frequency", section: "transportation", prompt: "How often do you carpool or share rides?", type: "single", options: ["Regularly (most trips shared)", "Sometimes (occasional carpooling)", "Rarely", "Never"] },
    { id: "q_transport_walk_cycle_days_per_week", section: "transportation", prompt: "How many days per week do you walk or cycle for transportation (not just exercise)?", type: "number", units: "days_per_week" },
    { id: "q_transport_public_transport_days_per_week", section: "transportation", prompt: "How many days per week do you use public transport (bus, train, subway)?", type: "number", units: "days_per_week" },
    { id: "q_transport_public_transport_trips_per_day", section: "transportation", prompt: "On those days, how many trips do you typically take?", type: "number", units: "trips_per_day" },
    { id: "q_transport_public_transport_type", section: "transportation", prompt: "What type of public transport do you primarily use?", type: "single", options: ["Bus", "Train/Subway", "Light rail/Tram", "Ferry"] },
    { id: "q_transport_rideshare_trips_per_month", section: "transportation", prompt: "How many ride-share trips do you take per month? (Uber, Lyft, etc.)", type: "number", units: "trips_per_month" },
    { id: "q_transport_flights_per_year", section: "transportation", prompt: "How many round-trip flights do you take per year?", type: "number", units: "round_trips_per_year" },
    { id: "q_transport_flight_duration_hours", section: "transportation", prompt: "What's the average flight duration in hours? (e.g., 2 for short, 6 for medium, 12 for long)", type: "number", units: "hours" },
    { id: "q_transport_flight_class", section: "transportation", prompt: "What class do you typically fly?", type: "single", options: ["Economy", "Premium Economy", "Business", "First Class"] },

    { id: "q_home_size", section: "home_energy", prompt: "What size is your home?", type: "single", options: ["Small (studio/1-bedroom apartment, under 50 m² / 500 sq ft)", "Medium (2-3 bedroom, 50-100 m² / 500-1000 sq ft)", "Large (4+ bedroom, 100-200 m² / 1000-2000 sq ft)", "Very large (200+ m² / 2000+ sq ft)"] },
    { id: "q_home_electricity_usage", section: "home_energy", prompt: "How would you describe your household's electricity usage?", type: "single", options: ["Very low (minimal appliances, LED lights, unplug when not in use)", "Low (energy-efficient appliances, mindful usage)", "Average (typical household usage)", "High (many devices, always on, older appliances)"] },
    { id: "q_home_appliance_efficiency", section: "home_energy", prompt: "How energy-efficient are your major appliances (refrigerator, washer, dryer, etc.)?", type: "single", options: ["Mostly Energy Star / highly efficient (newer models)", "Mix of efficient and older appliances", "Mostly older, less efficient appliances"] },
    { id: "q_home_renewable_energy", section: "home_energy", prompt: "Does your home use renewable energy?", type: "single", options: ["Yes, 100% renewable (solar panels, green energy plan)", "Partially renewable (some solar/wind)", "No, standard grid energy"] },
    { id: "q_home_heating_source", section: "home_energy", prompt: "What is your primary heating source?", type: "single", options: ["Natural gas", "Electric", "Oil", "Heat pump", "Wood/biomass", "No heating needed"] },
    { id: "q_home_heating_cooling_usage", section: "home_energy", prompt: "How much do you use heating/cooling?", type: "single", options: ["Minimal (only when necessary, efficient thermostat)", "Moderate (comfortable temperatures, some conservation)", "High (always comfortable, less conservation)"] },
    { id: "q_home_insulation", section: "home_energy", prompt: "How well is your home insulated?", type: "single", options: ["Very well insulated (newer construction, double-pane windows)", "Moderately insulated", "Poorly insulated (drafts, single-pane windows)"] },
    { id: "q_home_water_heater_type", section: "home_energy", prompt: "What type of water heater do you have?", type: "single", options: ["Solar water heater", "Heat pump water heater", "Natural gas", "Electric (standard)", "Oil/propane"] },
    { id: "q_home_lighting_type", section: "home_energy", prompt: "What type of lighting do you primarily use?", type: "single", options: ["All LED bulbs", "Mix of LED and CFL", "Mix of LED/CFL and incandescent", "Mostly incandescent"] },

    { id: "q_diet_meat_frequency", section: "diet", prompt: "How often do you eat meat (beef, pork, lamb)?", type: "single", options: ["Multiple times per day", "Once per day", "A few times per week", "Rarely (once per month or less)", "Never (vegetarian/vegan)"] },
    { id: "q_diet_primary_meat_type", section: "diet", prompt: "Which type of meat do you eat most often?", type: "single", options: ["Beef (highest emissions)", "Pork", "Lamb", "Chicken/Turkey (lower emissions)", "Mix of different meats"] },
    { id: "q_diet_dairy_eggs_frequency", section: "diet", prompt: "How often do you consume dairy products and eggs?", type: "single", options: ["Multiple times per day", "Once per day", "A few times per week", "Rarely", "Never (vegan)"] },
    { id: "q_diet_seafood_frequency", section: "diet", prompt: "How often do you eat seafood?", type: "single", options: ["Multiple times per week", "Once per week", "A few times per month", "Rarely", "Never"] },
    { id: "q_diet_plant_based_ratio", section: "diet", prompt: "How much of your diet consists of plant-based foods (fruits, vegetables, grains, legumes)?", type: "single", options: ["Most of my diet (80%+)", "About half", "Less than half"] },
    { id: "q_diet_local_organic_ratio", section: "diet", prompt: "How much of your food is locally sourced or organic?", type: "single", options: ["Mostly local/organic (50%+)", "Some local/organic (20-50%)", "Little to no local/organic (<20%)"] },
    { id: "q_diet_food_waste", section: "diet", prompt: "How much food do you typically waste?", type: "single", options: ["Very little (use everything, compost scraps)", "Some waste (occasionally throw away leftovers)", "Moderate waste (regularly discard food)", "Significant waste (often throw away food)"] },

    { id: "q_consumption_new_items_frequency", section: "consumption_habits", prompt: "How often do you buy new items (clothing, electronics, household goods)?", type: "single", options: ["Very rarely (only when necessary, minimal shopping)", "Occasionally (a few times per year)", "Regularly (monthly shopping)", "Frequently (weekly shopping, impulse buys)"] },
    { id: "q_consumption_shopping_mode", section: "consumption_habits", prompt: "How do you primarily shop?", type: "single", options: ["Mostly in-store (local shopping)", "Mix of online and in-store", "Mostly online shopping"] },
    { id: "q_consumption_electronics_frequency", section: "consumption_habits", prompt: "How often do you buy new electronics (phones, computers, gadgets)?", type: "single", options: ["Rarely (use until they break, 5+ years)", "Occasionally (every 3-4 years)", "Regularly (every 1-2 years)", "Frequently (upgrade often, latest models)"] },
    { id: "q_consumption_fast_fashion_frequency", section: "consumption_habits", prompt: "How often do you buy new clothing from fast fashion brands?", type: "single", options: ["Never or rarely (buy quality, second-hand, or sustainable brands)", "Occasionally (a few items per year)", "Regularly (monthly purchases)", "Frequently (weekly purchases)"] },
    { id: "q_consumption_furniture_frequency", section: "consumption_habits", prompt: "How often do you buy new furniture or major home goods?", type: "single", options: ["Rarely (buy quality items that last, second-hand)", "Occasionally (every few years)", "Regularly (yearly purchases)", "Frequently (multiple times per year)"] },
    { id: "q_consumption_packaging_awareness", section: "consumption_habits", prompt: "How much attention do you pay to product packaging?", type: "single", options: ["Very aware (avoid excessive packaging, buy in bulk)", "Somewhat aware (occasionally choose less packaging)", "Not very aware (don't consider packaging)"] },

    { id: "q_waste_recycle_level", section: "waste", prompt: "How much do you recycle?", type: "single", options: ["Comprehensive (recycle everything possible, know local rules)", "Moderate (recycle common items like paper, plastic, glass)", "Minimal (recycle occasionally)", "Rarely or never"] },
    { id: "q_waste_compost_frequency", section: "waste", prompt: "Do you compost organic waste?", type: "single", options: ["Yes, regularly", "Occasionally", "No"] },
    { id: "q_waste_single_use_frequency", section: "waste", prompt: "How often do you use single-use items (plastic bags, disposable cups, bottled water)?", type: "single", options: ["Rarely or never (reusable alternatives)", "Occasionally", "Regularly", "Frequently"] },
    { id: "q_waste_electronics_disposal", section: "waste", prompt: "How do you dispose of old electronics?", type: "single", options: ["Properly recycle at e-waste facilities", "Sometimes recycle, sometimes trash", "Usually throw in regular trash"] },
    { id: "q_waste_plastic_use", section: "waste", prompt: "How much plastic do you use in daily life?", type: "single", options: ["Minimal (avoid plastic, use alternatives)", "Moderate (some plastic, try to reduce)", "High (use a lot of plastic products)"] },
    { id: "q_waste_paper_use", section: "waste", prompt: "How much paper do you use?", type: "single", options: ["Minimal (digital-first, print rarely)", "Moderate (some printing, but try to reduce)", "High (print frequently, use lots of paper)"] }
  ]
};

#!/usr/bin/env python3
"""
Carbon Footprint Calculator
A comprehensive test to estimate your annual carbon footprint in kilograms of CO₂.
"""

import sys


def print_welcome():
    """Display welcome message."""
    print("\n" + "="*60)
    print("PRELIMINARY CARBON FOOTPRINT ASSESSMENT")
    print("="*60)
    print("\nWelcome! This test will help you estimate your annual carbon footprint.")
    print("It should take about 7-10 minutes to complete.")
    print("Please answer each question honestly for the most accurate results.\n")


def get_float_input(prompt, min_val=0, max_val=None):
    """Get a float input from the user with validation."""
    while True:
        try:
            value = float(input(prompt))
            if value < min_val:
                print(f"Please enter a value of at least {min_val}.")
                continue
            if max_val is not None and value > max_val:
                print(f"Please enter a value no more than {max_val}.")
                continue
            return value
        except ValueError:
            print("Please enter a valid number.")


def get_choice_input(prompt, choices):
    """Get a choice from the user from a list of options."""
    while True:
        print(prompt)
        for i, choice in enumerate(choices, 1):
            print(f"  {i}. {choice}")
        try:
            choice_num = int(input("\nEnter your choice (number): "))
            if 1 <= choice_num <= len(choices):
                return choice_num - 1
            else:
                print(f"Please enter a number between 1 and {len(choices)}.")
        except ValueError:
            print("Please enter a valid number.")


def transportation_category():
    """Calculate transportation-related carbon footprint."""
    print("\n" + "-"*60)
    print("TRANSPORTATION")
    print("-"*60)
    
    footprint = 0.0
    notes = []
    
    # Car usage
    print("\n1. Personal Vehicle Usage")
    has_car = input("Do you own or regularly use a car? (yes/no): ").lower().strip()
    
    if has_car in ['yes', 'y']:
        miles_per_week = get_float_input("How many miles/kilometers do you drive per week? ", 0)
        
        fuel_type = get_choice_input(
            "\nWhat type of fuel does your car use?",
            ["Gasoline/Petrol", "Diesel", "Hybrid (gasoline)", "Electric", "Plug-in Hybrid"]
        )
        
        # Vehicle age/efficiency
        vehicle_age = get_choice_input(
            "\nHow old is your primary vehicle?",
            ["Less than 3 years old (very efficient)",
             "3-7 years old (moderately efficient)",
             "8-12 years old (average efficiency)",
             "More than 12 years old (less efficient)"]
        )
        
        # Efficiency multipliers: newer cars are more efficient
        efficiency_multipliers = [0.9, 1.0, 1.1, 1.2]
        
        # CO₂ emissions per km (rough estimates)
        # Gasoline: ~0.2 kg/km, Diesel: ~0.25 kg/km, Hybrid: ~0.1 kg/km, Electric: ~0.05 kg/km (grid-dependent)
        fuel_multipliers = [0.2, 0.25, 0.1, 0.05, 0.08]
        annual_km = miles_per_week * 52
        base_emissions = annual_km * fuel_multipliers[fuel_type] * efficiency_multipliers[vehicle_age]
        
        # Carpooling
        carpool_frequency = get_choice_input(
            "\nHow often do you carpool or share rides?",
            ["Regularly (most trips shared)",
             "Sometimes (occasional carpooling)",
             "Rarely",
             "Never"]
        )
        
        # Carpooling reduces per-person emissions
        carpool_reductions = [0.4, 0.2, 0.1, 0.0]
        car_emissions = base_emissions * (1 - carpool_reductions[carpool_frequency])
        
        footprint += car_emissions
        notes.append(f"Car usage: {car_emissions:.0f} kg/year")
        
        if carpool_frequency <= 1:
            notes.append("positive: Carpooling helps reduce emissions per person!")
    
    # Active transportation
    print("\n2. Walking and Cycling")
    active_transport_days = get_float_input(
        "How many days per week do you walk or cycle for transportation (not just exercise)? ", 0, 7
    )
    
    if active_transport_days >= 3:
        notes.append("positive: Walking and cycling are zero-emission — excellent choice!")
    
    # Public transport
    print("\n3. Public Transportation")
    public_transport_days = get_float_input(
        "How many days per week do you use public transport (bus, train, subway)? ", 0, 7
    )
    
    if public_transport_days > 0:
        avg_trips = get_float_input("On those days, how many trips do you typically take? ", 0)
        transport_type = get_choice_input(
            "\nWhat type of public transport do you primarily use?",
            ["Bus", "Train/Subway", "Light rail/Tram", "Ferry"]
        )
        
        # Different transport types have different emissions
        # Bus: ~0.05 kg/trip, Train: ~0.03 kg/trip, Light rail: ~0.02 kg/trip, Ferry: ~0.1 kg/trip
        transport_multipliers = [0.05, 0.03, 0.02, 0.1]
        public_transport_emissions = public_transport_days * 52 * avg_trips * transport_multipliers[transport_type]
        footprint += public_transport_emissions
        notes.append(f"Public transport: {public_transport_emissions:.0f} kg/year")
        
        if public_transport_days >= 3:
            notes.append("positive: You use public transport regularly — great for reducing emissions!")
    
    # Ride-sharing services
    print("\n4. Ride-Sharing Services (Uber, Lyft, etc.)")
    rideshare_trips = get_float_input(
        "How many ride-share trips do you take per month? ", 0
    )
    
    if rideshare_trips > 0:
        # Rough estimate: ~0.15 kg CO₂ per km, average trip ~5 km
        rideshare_emissions = rideshare_trips * 12 * 5 * 0.15
        footprint += rideshare_emissions
        notes.append(f"Ride-sharing: {rideshare_emissions:.0f} kg/year")
    
    # Flights
    print("\n5. Air Travel")
    flights_per_year = get_float_input(
        "How many round-trip flights do you take per year? ", 0
    )
    
    if flights_per_year > 0:
        avg_flight_hours = get_float_input(
            "What's the average flight duration in hours? (e.g., 2 for short, 6 for medium, 12 for long): ", 0
        )
        
        flight_class = get_choice_input(
            "\nWhat class do you typically fly?",
            ["Economy", "Premium Economy", "Business", "First Class"]
        )
        
        # Flight class multipliers (higher classes take more space = higher emissions)
        class_multipliers = [1.0, 1.3, 2.0, 3.0]
        
        # Rough estimate: ~250 kg CO₂ per hour of flight (economy)
        flight_emissions = flights_per_year * avg_flight_hours * 250 * class_multipliers[flight_class]
        footprint += flight_emissions
        notes.append(f"Air travel: {flight_emissions:.0f} kg/year")
        
        if flights_per_year > 4:
            notes.append("improvement: Consider reducing flights or offsetting emissions when possible.")
        elif flights_per_year > 0:
            notes.append("improvement: For necessary flights, consider economy class and carbon offsets.")
    
    return footprint, notes


def home_energy_category():
    """Calculate home energy-related carbon footprint."""
    print("\n" + "-"*60)
    print("HOME ENERGY")
    print("-"*60)
    
    footprint = 0.0
    notes = []
    
    # Home size
    print("\n1. Home Size")
    home_size = get_choice_input(
        "What size is your home?",
        ["Small (studio/1-bedroom apartment, under 50 m² / 500 sq ft)",
         "Medium (2-3 bedroom, 50-100 m² / 500-1000 sq ft)",
         "Large (4+ bedroom, 100-200 m² / 1000-2000 sq ft)",
         "Very large (200+ m² / 2000+ sq ft)"]
    )
    
    # Home size affects base energy usage
    size_multipliers = [0.7, 1.0, 1.5, 2.2]
    
    # Electricity
    print("\n2. Electricity Usage")
    electricity_choice = get_choice_input(
        "How would you describe your household's electricity usage?",
        ["Very low (minimal appliances, LED lights, unplug when not in use)",
         "Low (energy-efficient appliances, mindful usage)",
         "Average (typical household usage)",
         "High (many devices, always on, older appliances)"]
    )
    
    # Rough estimates: Very low ~1000 kWh/year, Low ~2000, Average ~4000, High ~8000
    # At ~0.5 kg CO₂/kWh (varies by grid)
    electricity_multipliers = [500, 1000, 2000, 4000]  # kg CO₂/year
    electricity_emissions = electricity_multipliers[electricity_choice] * size_multipliers[home_size]
    footprint += electricity_emissions
    notes.append(f"Electricity: {electricity_emissions:.0f} kg/year")
    
    # Appliance efficiency
    print("\n3. Appliance Efficiency")
    appliance_efficiency = get_choice_input(
        "How energy-efficient are your major appliances (refrigerator, washer, dryer, etc.)?",
        ["Mostly Energy Star / highly efficient (newer models)",
         "Mix of efficient and older appliances",
         "Mostly older, less efficient appliances"]
    )
    
    # Efficiency adjustments (kg)
    efficiency_adjustments = [-200, 0, 300]
    footprint += efficiency_adjustments[appliance_efficiency]
    if appliance_efficiency == 0:
        notes.append("positive: Energy-efficient appliances reduce your footprint!")
    
    # Renewable energy
    print("\n4. Renewable Energy")
    has_renewable = get_choice_input(
        "Does your home use renewable energy?",
        ["Yes, 100% renewable (solar panels, green energy plan)",
         "Partially renewable (some solar/wind)",
         "No, standard grid energy"]
    )
    
    if has_renewable == 0:
        electricity_emissions *= 0.1  # 90% reduction
        footprint -= electricity_multipliers[electricity_choice] * size_multipliers[home_size] * 0.9
        notes[-1] = f"Electricity (with renewables): {electricity_emissions:.0f} kg/year"
        notes.append("positive: Using renewable energy significantly reduces your footprint!")
    elif has_renewable == 1:
        electricity_emissions *= 0.5  # 50% reduction
        footprint -= electricity_multipliers[electricity_choice] * size_multipliers[home_size] * 0.5
        notes[-1] = f"Electricity (partial renewables): {electricity_emissions:.0f} kg/year"
    
    # Heating/Cooling
    print("\n5. Heating and Cooling")
    heating_type = get_choice_input(
        "What is your primary heating source?",
        ["Natural gas", "Electric", "Oil", "Heat pump", "Wood/biomass", "No heating needed"]
    )
    
    heating_usage = get_choice_input(
        "How much do you use heating/cooling?",
        ["Minimal (only when necessary, efficient thermostat)",
         "Moderate (comfortable temperatures, some conservation)",
         "High (always comfortable, less conservation)"]
    )
    
    # Home insulation
    insulation_quality = get_choice_input(
        "\nHow well is your home insulated?",
        ["Very well insulated (newer construction, double-pane windows)",
         "Moderately insulated",
         "Poorly insulated (drafts, single-pane windows)"]
    )
    
    # Rough estimates in kg/year (base values)
    heating_emissions_map = {
        0: [500, 1000, 2000],  # Natural gas
        1: [300, 600, 1200],  # Electric
        2: [800, 1500, 3000],  # Oil
        3: [200, 400, 800],  # Heat pump
        4: [100, 300, 600],  # Wood/biomass (carbon neutral if sustainable)
        5: [0.0, 0.0, 0.0]   # No heating
    }
    
    base_heating = heating_emissions_map[heating_type][heating_usage]
    
    # Insulation adjustments: good insulation reduces heating needs
    insulation_multipliers = [0.8, 1.0, 1.3]
    heating_emissions = base_heating * insulation_multipliers[insulation_quality] * size_multipliers[home_size]
    
    footprint += heating_emissions
    if heating_emissions > 0:
        notes.append(f"Heating/cooling: {heating_emissions:.0f} kg/year")
    
    if heating_type == 3:
        notes.append("positive: Heat pumps are very efficient — excellent choice!")
    if insulation_quality == 0:
        notes.append("positive: Good insulation reduces energy needs!")
    
    # Water heating
    print("\n6. Water Heating")
    water_heating = get_choice_input(
        "What type of water heater do you have?",
        ["Solar water heater",
         "Heat pump water heater",
         "Natural gas",
         "Electric (standard)",
         "Oil/propane"]
    )
    
    # Water heating emissions (kg/year)
    water_heating_emissions_map = [0, 100, 400, 500, 600]
    water_emissions = water_heating_emissions_map[water_heating] * size_multipliers[home_size]
    footprint += water_emissions
    if water_emissions > 0:
        notes.append(f"Water heating: {water_emissions:.0f} kg/year")
    
    if water_heating <= 1:
        notes.append("positive: Efficient water heating reduces emissions!")
    
    # Lighting
    print("\n7. Lighting")
    lighting_type = get_choice_input(
        "What type of lighting do you primarily use?",
        ["All LED bulbs",
         "Mix of LED and CFL",
         "Mix of LED/CFL and incandescent",
         "Mostly incandescent"]
    )
    
    # Lighting emissions (small but adds up) in kg/year
    lighting_emissions_map = [50, 100, 200, 400]
    lighting_emissions = lighting_emissions_map[lighting_type] * size_multipliers[home_size]
    footprint += lighting_emissions
    
    if lighting_type == 0:
        notes.append("positive: LED lighting is highly efficient!")
    
    return footprint, notes


def diet_category():
    """Calculate diet-related carbon footprint."""
    print("\n" + "-"*60)
    print("DIET")
    print("-"*60)
    
    footprint = 0.0
    notes = []
    
    print("\n1. Meat Consumption")
    meat_frequency = get_choice_input(
        "How often do you eat meat (beef, pork, lamb)?",
        ["Multiple times per day",
         "Once per day",
         "A few times per week",
         "Rarely (once per month or less)",
         "Never (vegetarian/vegan)"]
    )
    
    # Meat type breakdown
    if meat_frequency < 4:  # If they eat meat
        meat_type = get_choice_input(
            "\nWhich type of meat do you eat most often?",
            ["Beef (highest emissions)",
             "Pork",
             "Lamb",
             "Chicken/Turkey (lower emissions)",
             "Mix of different meats"]
        )
        
        # Beef has much higher emissions than poultry
        meat_type_multipliers = [1.5, 1.0, 1.3, 0.5, 1.0]
    else:
        meat_type_multipliers = [1.0]
        meat_type = 0
    
    # Rough estimates: High meat ~2500 kg/year, Daily ~1500, Weekly ~800, Rarely ~300, None ~100
    base_meat_emissions = [2500, 1500, 800, 300, 100][meat_frequency]
    meat_emissions = base_meat_emissions * (meat_type_multipliers[meat_type] if meat_frequency < 4 else 1.0)
    footprint += meat_emissions
    notes.append(f"Meat consumption: {meat_emissions:.0f} kg/year")
    
    if meat_frequency >= 3:
        notes.append("positive: Lower meat consumption helps reduce your footprint significantly!")
    elif meat_frequency < 4 and meat_type == 3:
        notes.append("positive: Choosing poultry over red meat reduces emissions!")
    
    print("\n2. Dairy and Eggs")
    dairy_frequency = get_choice_input(
        "How often do you consume dairy products and eggs?",
        ["Multiple times per day",
         "Once per day",
         "A few times per week",
         "Rarely",
         "Never (vegan)"]
    )
    
    # Rough estimates in kg/year
    dairy_emissions = [800, 500, 300, 100, 0][dairy_frequency]
    footprint += dairy_emissions
    notes.append(f"Dairy/eggs: {dairy_emissions:.0f} kg/year")
    
    print("\n3. Seafood")
    seafood_frequency = get_choice_input(
        "How often do you eat seafood?",
        ["Multiple times per week",
         "Once per week",
         "A few times per month",
         "Rarely",
         "Never"]
    )
    
    # Seafood emissions vary by type, but average moderate
    seafood_emissions = [400, 200, 100, 50, 0][seafood_frequency]
    footprint += seafood_emissions
    if seafood_emissions > 0:
        notes.append(f"Seafood: {seafood_emissions:.0f} kg/year")
    
    print("\n4. Plant-Based Foods")
    plant_frequency = get_choice_input(
        "How much of your diet consists of plant-based foods (fruits, vegetables, grains, legumes)?",
        ["Most of my diet (80%+)",
         "About half",
         "Less than half"]
    )
    
    # Plant-based foods have lower emissions, but still contribute
    plant_emissions = [300, 500, 700][plant_frequency]
    footprint += plant_emissions
    notes.append(f"Plant-based foods: {plant_emissions:.0f} kg/year")
    
    print("\n5. Food Sourcing")
    food_sourcing = get_choice_input(
        "How much of your food is locally sourced or organic?",
        ["Mostly local/organic (50%+)",
         "Some local/organic (20-50%)",
         "Little to no local/organic (<20%)"]
    )
    
    # Local/organic food has slightly lower emissions (less transport, different farming methods)
    # Reduction is a percentage (15%, 8%, or 0%)
    sourcing_reductions = [0.15, 0.08, 0.0]
    sourcing_reduction = (meat_emissions + dairy_emissions + plant_emissions) * sourcing_reductions[food_sourcing]
    footprint -= sourcing_reduction
    
    if food_sourcing == 0:
        notes.append("positive: Supporting local and organic food reduces transport emissions!")
    
    print("\n6. Food Waste")
    food_waste = get_choice_input(
        "How much food do you typically waste?",
        ["Very little (use everything, compost scraps)",
         "Some waste (occasionally throw away leftovers)",
         "Moderate waste (regularly discard food)",
         "Significant waste (often throw away food)"]
    )
    
    # Food waste contributes to emissions (production + methane from landfills)
    food_waste_emissions = [100, 300, 500, 800][food_waste]
    footprint += food_waste_emissions
    notes.append(f"Food waste: {food_waste_emissions:.0f} kg/year")
    
    if food_waste == 0:
        notes.append("positive: Minimizing food waste reduces emissions significantly!")
    else:
        notes.append("improvement: Reducing food waste can lower your footprint — plan meals and use leftovers!")
    
    if meat_frequency >= 2:
        notes.append("improvement: Consider reducing meat consumption — it's one of the biggest impact areas!")
    
    return footprint, notes


def consumption_category():
    """Calculate consumption habits-related carbon footprint."""
    print("\n" + "-"*60)
    print("CONSUMPTION HABITS")
    print("-"*60)
    
    footprint = 0.0
    notes = []
    
    print("\n1. Shopping Frequency")
    shopping_frequency = get_choice_input(
        "How often do you buy new items (clothing, electronics, household goods)?",
        ["Very rarely (only when necessary, minimal shopping)",
         "Occasionally (a few times per year)",
         "Regularly (monthly shopping)",
         "Frequently (weekly shopping, impulse buys)"]
    )
    
    # Rough estimates in kg/year
    base_shopping_emissions = [300, 800, 1500, 2500][shopping_frequency]
    
    print("\n2. Online vs. In-Store Shopping")
    online_shopping = get_choice_input(
        "How do you primarily shop?",
        ["Mostly in-store (local shopping)",
         "Mix of online and in-store",
         "Mostly online shopping"]
    )
    
    # Online shopping has higher emissions due to packaging and shipping
    online_multipliers = [0.9, 1.0, 1.2]
    shopping_emissions = base_shopping_emissions * online_multipliers[online_shopping]
    footprint += shopping_emissions
    notes.append(f"Shopping: {shopping_emissions:.0f} kg/year")
    
    if shopping_frequency <= 1:
        notes.append("positive: Minimal shopping reduces waste and emissions — great habit!")
    if online_shopping == 0:
        notes.append("positive: Shopping locally reduces packaging and shipping emissions!")
    
    print("\n3. Electronics")
    electronics_frequency = get_choice_input(
        "How often do you buy new electronics (phones, computers, gadgets)?",
        ["Rarely (use until they break, 5+ years)",
         "Occasionally (every 3-4 years)",
         "Regularly (every 1-2 years)",
         "Frequently (upgrade often, latest models)"]
    )
    
    electronics_emissions = [200, 500, 1000, 1800][electronics_frequency]
    footprint += electronics_emissions
    notes.append(f"Electronics: {electronics_emissions:.0f} kg/year")
    
    if electronics_frequency <= 1:
        notes.append("positive: Using electronics longer reduces e-waste and emissions!")
    
    print("\n4. Fast Fashion")
    fashion_frequency = get_choice_input(
        "How often do you buy new clothing from fast fashion brands?",
        ["Never or rarely (buy quality, second-hand, or sustainable brands)",
         "Occasionally (a few items per year)",
         "Regularly (monthly purchases)",
         "Frequently (weekly purchases)"]
    )
    
    fashion_emissions = [100, 400, 900, 1500][fashion_frequency]
    footprint += fashion_emissions
    notes.append(f"Fashion: {fashion_emissions:.0f} kg/year")
    
    if fashion_frequency <= 1:
        notes.append("positive: Avoiding fast fashion helps reduce your footprint!")
    else:
        notes.append("improvement: Consider buying second-hand or from sustainable brands.")
    
    print("\n5. Furniture and Home Goods")
    furniture_frequency = get_choice_input(
        "How often do you buy new furniture or major home goods?",
        ["Rarely (buy quality items that last, second-hand)",
         "Occasionally (every few years)",
         "Regularly (yearly purchases)",
         "Frequently (multiple times per year)"]
    )
    
    furniture_emissions = [100, 300, 600, 1000][furniture_frequency]
    footprint += furniture_emissions
    notes.append(f"Furniture/home goods: {furniture_emissions:.0f} kg/year")
    
    if furniture_frequency == 0:
        notes.append("positive: Buying quality and second-hand furniture reduces waste!")
    
    print("\n6. Packaging Awareness")
    packaging_awareness = get_choice_input(
        "How much attention do you pay to product packaging?",
        ["Very aware (avoid excessive packaging, buy in bulk)",
         "Somewhat aware (occasionally choose less packaging)",
         "Not very aware (don't consider packaging)"]
    )
    
    # Packaging contributes to emissions (kg/year)
    packaging_emissions = [100, 200, 400][packaging_awareness]
    footprint += packaging_emissions
    
    if packaging_awareness == 0:
        notes.append("positive: Being mindful of packaging reduces waste emissions!")
    
    return footprint, notes


def waste_category():
    """Calculate waste-related carbon footprint."""
    print("\n" + "-"*60)
    print("WASTE")
    print("-"*60)
    
    footprint = 0.0
    notes = []
    
    print("\n1. Recycling")
    recycling_effort = get_choice_input(
        "How much do you recycle?",
        ["Comprehensive (recycle everything possible, know local rules)",
         "Moderate (recycle common items like paper, plastic, glass)",
         "Minimal (recycle occasionally)",
         "Rarely or never"]
    )
    
    # Recycling reduces emissions from waste
    # Base waste emissions ~800 kg/year, reduced by recycling
    recycling_reductions = [600, 400, 200, 0]
    waste_emissions = 800 - recycling_reductions[recycling_effort]
    footprint += waste_emissions
    notes.append(f"Waste (after recycling): {waste_emissions:.0f} kg/year")
    
    if recycling_effort <= 1:
        notes.append("positive: Good recycling habits help reduce waste emissions!")
    
    print("\n2. Composting")
    composting = get_choice_input(
        "Do you compost organic waste?",
        ["Yes, regularly",
         "Occasionally",
         "No"]
    )
    
    if composting == 0:
        waste_emissions -= 100
        footprint -= 100
        notes[-1] = f"Waste (with composting): {waste_emissions:.0f} kg/year"
        notes.append("positive: Composting reduces methane emissions from landfills!")
    
    print("\n3. Single-Use Items")
    single_use = get_choice_input(
        "How often do you use single-use items (plastic bags, disposable cups, bottled water)?",
        ["Rarely or never (reusable alternatives)",
         "Occasionally",
         "Regularly",
         "Frequently"]
    )
    
    single_use_emissions = [100, 300, 500, 800][single_use]
    footprint += single_use_emissions
    notes.append(f"Single-use items: {single_use_emissions:.0f} kg/year")
    
    if single_use == 0:
        notes.append("positive: Avoiding single-use items reduces waste and emissions!")
    else:
        notes.append("improvement: Consider switching to reusable alternatives.")
    
    print("\n4. E-Waste Disposal")
    ewaste_disposal = get_choice_input(
        "How do you dispose of old electronics?",
        ["Properly recycle at e-waste facilities",
         "Sometimes recycle, sometimes trash",
         "Usually throw in regular trash"]
    )
    
    # E-waste in landfills is harmful (kg/year)
    ewaste_emissions = [0, 100, 300][ewaste_disposal]
    footprint += ewaste_emissions
    
    if ewaste_disposal == 0:
        notes.append("positive: Proper e-waste recycling prevents harmful emissions!")
    else:
        notes.append("improvement: Recycle electronics at proper facilities to reduce harmful emissions.")
    
    print("\n5. Plastic Usage")
    plastic_usage = get_choice_input(
        "How much plastic do you use in daily life?",
        ["Minimal (avoid plastic, use alternatives)",
         "Moderate (some plastic, try to reduce)",
         "High (use a lot of plastic products)"]
    )
    
    # Plastic production and disposal emissions (kg/year)
    plastic_emissions = [100, 300, 600][plastic_usage]
    footprint += plastic_emissions
    
    if plastic_usage == 0:
        notes.append("positive: Reducing plastic use helps lower your footprint!")
    else:
        notes.append("improvement: Consider reducing plastic use — it's a major source of emissions.")
    
    print("\n6. Paper Usage")
    paper_usage = get_choice_input(
        "How much paper do you use?",
        ["Minimal (digital-first, print rarely)",
         "Moderate (some printing, but try to reduce)",
         "High (print frequently, use lots of paper)"]
    )
    
    # Paper production and disposal emissions (kg/year)
    paper_emissions = [50, 150, 300][paper_usage]
    footprint += paper_emissions
    
    if paper_usage == 0:
        notes.append("positive: Going digital reduces paper waste and emissions!")
    
    return footprint, notes


def generate_summary(total_footprint, all_notes):
    """Generate and display the personalized summary."""
    print("\n" + "="*60)
    print("  YOUR CARBON FOOTPRINT SUMMARY")
    print("="*60)
    
    print(f"\n📊 Total Estimated Annual Carbon Footprint: {total_footprint:,.0f} kg CO₂")
    
    # Canada's average is approximately 15,600 kg per person per year (15.6 tons)
    CANADA_AVERAGE = 15600
    global_average = 4800
    sustainable_target = 2300
    
    # Comparison to Canada's average
    print(f"\n🇨🇦 Comparison to Canada's Average:")
    print(f"   Canada's average: {CANADA_AVERAGE:,} kg CO₂ per person/year")
    difference = total_footprint - CANADA_AVERAGE
    percentage = (total_footprint / CANADA_AVERAGE) * 100
    
    if total_footprint < CANADA_AVERAGE:
        print(f"   Your footprint is {abs(difference):,.0f} kg LOWER than Canada's average ({percentage:.1f}% of average)")
        print(f"   🎉 Great job! You're doing better than the Canadian average!")
    elif total_footprint > CANADA_AVERAGE:
        print(f"   Your footprint is {difference:,.0f} kg HIGHER than Canada's average ({percentage:.1f}% of average)")
        print(f"   💡 There's significant room for improvement to reach the Canadian average.")
    else:
        print(f"   Your footprint matches Canada's average exactly.")
    
    # Context: Global average is ~4,700 kg, sustainable target is ~2,000 kg
    print("\n📈 Global Context:")
    if total_footprint < sustainable_target:
        print(f"   Excellent! You're below the sustainable target of ~{sustainable_target:,} kg/year.")
    elif total_footprint < global_average:
        print(f"   Good! You're below the global average of ~{global_average:,} kg/year.")
    elif total_footprint < CANADA_AVERAGE:
        print(f"   You're below Canada's average but above the global average.")
    else:
        print(f"   Your footprint is above both the global and Canadian averages. Every change helps!")
    
    # Separate positive notes
    positive_notes = [n for n in all_notes if n.startswith("positive:")]
    
    if positive_notes:
        print("\n✅ What You're Doing Well:")
        for note in positive_notes:
            print(f"   • {note.replace('positive: ', '')}")
    
    # Category breakdown
    print("\n📋 Category Breakdown:")
    category_notes = [n for n in all_notes if not n.startswith("positive:") and not n.startswith("improvement:")]
    for note in category_notes:
        print(f"   • {note}")
    
    # Additional comparison info
    if total_footprint > CANADA_AVERAGE:
        reduction_needed = total_footprint - CANADA_AVERAGE
        print(f"\n💪 To reach Canada's average, you'd need to reduce by {reduction_needed:,.0f} kg/year.")
    
    print("\n" + "="*60)
    print("Thank you for taking the time to assess your carbon footprint!")
    print("Remember: every small change makes a difference. 🌱")
    print("="*60 + "\n")


def main():
    """Main function to run the carbon footprint calculator."""
    print_welcome()
    
    try:
        total_footprint = 0.0
        all_notes = []
        
        # Transportation
        transport_footprint, transport_notes = transportation_category()
        total_footprint += transport_footprint
        all_notes.extend(transport_notes)
        
        # Home Energy
        energy_footprint, energy_notes = home_energy_category()
        total_footprint += energy_footprint
        all_notes.extend(energy_notes)
        
        # Diet
        diet_footprint, diet_notes = diet_category()
        total_footprint += diet_footprint
        all_notes.extend(diet_notes)
        
        # Consumption
        consumption_footprint, consumption_notes = consumption_category()
        total_footprint += consumption_footprint
        all_notes.extend(consumption_notes)
        
        # Waste
        waste_footprint, waste_notes = waste_category()
        total_footprint += waste_footprint
        all_notes.extend(waste_notes)
        
        # Generate summary
        generate_summary(total_footprint, all_notes)
        
    except KeyboardInterrupt:
        print("\n\nTest interrupted. Thank you for your time!")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nAn error occurred: {e}")
        print("Please try running the test again.")
        sys.exit(1)


if __name__ == "__main__":
    main()


import { useState } from "react";
import {
  Home, CalendarDays, ShoppingCart, Users, UtensilsCrossed,
  ArrowLeft, ThumbsUp, Plus, Check, X, Sparkles,
  Clock, Flame, Lock, Unlock, MessageCircle, Pencil, Check as CheckIcon, AlertTriangle, Activity
} from "lucide-react";

const colors = {
  bg: "#FBF6EF",
  card: "#FFFFFF",
  ink: "#2B1B12",
  inkSoft: "#8A7563",
  primary: "#C1440E",
  primaryDeep: "#8F330A",
  primarySoft: "#F6DCC9",
  secondary: "#4A7856",
  secondarySoft: "#DEE9DF",
  gold: "#A9720A",
  goldSoft: "#FBEACB",
  border: "#EFE3D2",
  dislike: "#B24C4C",
  dislikeSoft: "#F3DEDD",
  nonveg: "#A6432F",
  nonvegSoft: "#F3DED7",
  vegan: "#3F7D6B",
  veganSoft: "#DCEBE6",
  shadow: "0 8px 22px rgba(43,27,18,0.08)",
};

const serif = { fontFamily: "'Fraunces', serif" };
const sans = { fontFamily: "'Work Sans', sans-serif" };

const dietMeta = {
  all: { label: "All", color: colors.inkSoft, bg: colors.border },
  vegetarian: { label: "Vegetarian", color: colors.secondary, bg: colors.secondarySoft },
  "non-vegetarian": { label: "Non-vegetarian", color: colors.nonveg, bg: colors.nonvegSoft },
  vegan: { label: "Vegan", color: colors.vegan, bg: colors.veganSoft },
  fasting: { label: "Fasting", color: colors.gold, bg: colors.goldSoft },
  diet: { label: "Diet", color: colors.primary, bg: colors.primarySoft },
};
const dietOrder = ["all", "vegetarian", "non-vegetarian", "vegan", "fasting", "diet"];

const allergensList = ["Dairy", "Gluten", "Nuts", "Soy", "Egg", "Seafood"];
const conditionsList = ["Diabetes", "High blood pressure", "Heart condition", "Thyroid"];
const conditionAvoidFlags = {
  Diabetes: ["high-sugar", "high-carb"],
  "High blood pressure": ["high-sodium", "fried"],
  "Heart condition": ["fried", "high-fat"],
  Thyroid: [],
};

function getCalorieTarget(ageGroup, gender) {
  const table = {
    Child: 1500,
    Teen: gender === "male" ? 2200 : 2000,
    Adult: gender === "male" ? 2400 : 2000,
    Senior: gender === "male" ? 2000 : 1800,
  };
  return table[ageGroup] || 2000;
}

function getMacroSplit(member) {
  let protein = 18, carbs = 55, fat = 27;
  if (member.ageGroup === "Child" || member.ageGroup === "Teen") protein += 4;
  if (member.conditions.includes("Diabetes")) { carbs -= 10; protein += 4; fat += 6; }
  if (member.conditions.includes("Heart condition")) fat = Math.min(fat, 22);
  const total = protein + carbs + fat;
  return {
    protein: Math.round((protein / total) * 100),
    carbs: Math.round((carbs / total) * 100),
    fat: Math.round((fat / total) * 100),
  };
}

const plateGuide = {
  Child: { grains: "4-5 rotis or 1.5 cups rice", protein: "1 cup dal, or 1 egg + a small katori paneer", vegetables: "1.5 cups mixed vegetables", fruits: "1-2 servings", dairy: "2-3 cups milk/curd", water: "1.5-2 L" },
  Teen: { grains: "6-7 rotis or 2 cups rice", protein: "1.5 cups dal, or 150g chicken/paneer", vegetables: "2 cups mixed vegetables", fruits: "2 servings", dairy: "2-3 cups milk/curd", water: "2-2.5 L" },
  Adult: { grains: "5-6 rotis or 2 cups rice", protein: "1.5 cups dal, or 100-150g meat/paneer", vegetables: "2.5-3 cups mixed vegetables", fruits: "2 servings", dairy: "1.5-2 cups milk/curd", water: "2.5-3 L" },
  Senior: { grains: "4-5 rotis or 1.5 cups rice", protein: "1 cup dal, or 100g paneer/fish", vegetables: "2.5 cups mixed vegetables, well-cooked", fruits: "2 servings", dairy: "1.5 cups milk/curd, low-fat", water: "2-2.5 L" },
};

function getNutritionNotes(member) {
  const notes = [];
  if (member.conditions.includes("Diabetes")) notes.push("Favor whole grains and legumes; limit refined sugar and high-GI fruits like mango or banana to occasional treats.");
  if (member.conditions.includes("High blood pressure")) notes.push("Limit added salt, pickles, and packaged or processed foods.");
  if (member.conditions.includes("Heart condition")) notes.push("Use less oil/ghee overall; prefer steamed, grilled, or roasted preparations over fried.");
  if (member.conditions.includes("Thyroid")) notes.push("Keep iodine intake consistent day to day; discuss timing of soy foods with your doctor.");
  if (member.allergies.includes("Dairy")) notes.push("Swap dairy portions for soy or almond milk, or extra dal, to keep calcium intake up.");
  if (member.allergies.includes("Nuts")) notes.push("Avoid peanut oil and nut garnishes in shared family dishes cooked for this member.");
  if (member.allergies.includes("Gluten")) notes.push("Replace wheat roti with rice, jowar, or bajra rotis.");
  return notes;
}

function getHealthWarnings(recipe, members) {
  const warnings = [];
  members.forEach((m) => {
    (m.allergies || []).forEach((a) => {
      if (recipe.allergens && recipe.allergens.includes(a)) {
        warnings.push({ severity: "allergy", text: `${m.name} is allergic to ${a}` });
      }
    });
    (m.conditions || []).forEach((c) => {
      const avoid = conditionAvoidFlags[c] || [];
      const hit = (recipe.healthFlags || []).find((f) => avoid.includes(f));
      if (hit) {
        warnings.push({ severity: "condition", text: `${m.name} has ${c} — this dish is ${hit.replace("-", " ")}` });
      }
    });
  });
  return warnings;
}

// ---------------- mock recipe data ----------------
const recipesById = {
  poha: {
    id: "poha", name: "Poha + Curd", emoji: "🥣", mealType: "breakfast", diets: ["vegetarian"],
    allergens: ["Dairy"], healthFlags: [],
    prepTime: 5, cookTime: 10, servings: 4, difficulty: "Easy", match: 92,
    reasons: ["Family loves it", "Ready in 15 minutes", "All ingredients at home"],
    ingredients: [
      { name: "Poha (flattened rice)", qty: "2 cups", category: "Grains" },
      { name: "Onion", qty: "1", category: "Vegetables" },
      { name: "Potato", qty: "1", category: "Vegetables" },
      { name: "Mustard seeds", qty: "1 tsp", category: "Spices" },
      { name: "Curry leaves", qty: "8-10", category: "Spices" },
      { name: "Curd", qty: "1 cup", category: "Dairy" },
      { name: "Lemon", qty: "1", category: "Fruits" },
    ],
    steps: [
      "Rinse poha in water for 30 seconds, drain and set aside.",
      "Heat oil, splutter mustard seeds and curry leaves.",
      "Add chopped onion and potato, cook till soft.",
      "Add poha, turmeric and salt, mix gently for 3-4 minutes.",
      "Finish with lemon juice and serve with curd.",
    ],
  },
  paratha: {
    id: "paratha", name: "Aloo Paratha + Curd", emoji: "🫓", mealType: "breakfast", diets: ["vegetarian"],
    allergens: ["Dairy", "Gluten"], healthFlags: ["fried", "high-carb"],
    prepTime: 15, cookTime: 20, servings: 4, difficulty: "Medium", match: 85,
    reasons: ["Kids' favourite", "Filling for a busy morning", "Not eaten this week"],
    ingredients: [
      { name: "Wheat flour", qty: "3 cups", category: "Grains" },
      { name: "Potato", qty: "4", category: "Vegetables" },
      { name: "Green chilli", qty: "2", category: "Vegetables" },
      { name: "Ghee", qty: "3 tbsp", category: "Dairy" },
      { name: "Curd", qty: "1 cup", category: "Dairy" },
    ],
    steps: [
      "Boil and mash potatoes with chilli, salt and spices.",
      "Knead the dough and rest for 15 minutes.",
      "Stuff dough with potato filling and roll gently.",
      "Cook on a hot tawa with ghee until golden on both sides.",
      "Serve hot with curd and pickle.",
    ],
  },
  "egg-bhurji": {
    id: "egg-bhurji", name: "Egg Bhurji + Toast", emoji: "🍳", mealType: "breakfast", diets: ["non-vegetarian"],
    allergens: ["Egg", "Gluten"], healthFlags: [],
    prepTime: 5, cookTime: 10, servings: 4, difficulty: "Easy", match: 89,
    reasons: ["Quick protein-rich start", "Ready in 15 minutes", "Family's non-veg favourite"],
    ingredients: [
      { name: "Eggs", qty: "6", category: "Other" },
      { name: "Onion", qty: "1", category: "Vegetables" },
      { name: "Tomato", qty: "1", category: "Vegetables" },
      { name: "Bread", qty: "8 slices", category: "Grains" },
    ],
    steps: [
      "Sauté chopped onion and tomato with turmeric and chilli.",
      "Whisk eggs, pour into the pan and scramble until just set.",
      "Toast the bread slices.",
      "Serve egg bhurji hot with buttered toast.",
    ],
  },
  "besan-chilla": {
    id: "besan-chilla", name: "Besan Chilla (Vegan)", emoji: "🥞", mealType: "breakfast", diets: ["vegetarian", "vegan"],
    allergens: [], healthFlags: [],
    prepTime: 10, cookTime: 10, servings: 4, difficulty: "Easy", match: 84,
    reasons: ["Fully plant-based", "Light and quick", "Good source of protein"],
    ingredients: [
      { name: "Gram flour (besan)", qty: "2 cups", category: "Grains" },
      { name: "Onion", qty: "1", category: "Vegetables" },
      { name: "Tomato", qty: "1", category: "Vegetables" },
      { name: "Coriander", qty: "1/2 bunch", category: "Vegetables" },
    ],
    steps: [
      "Whisk besan with water into a smooth, pourable batter.",
      "Mix in chopped onion, tomato, coriander and spices.",
      "Pour a ladle onto a hot greased tawa and spread thin.",
      "Cook both sides until golden and serve hot.",
    ],
  },
  "sabudana-khichdi": {
    id: "sabudana-khichdi", name: "Sabudana Khichdi (Vrat)", emoji: "🥣", mealType: "breakfast", diets: ["fasting", "vegetarian"],
    allergens: ["Dairy", "Nuts"], healthFlags: ["high-carb"],
    prepTime: 240, cookTime: 15, servings: 4, difficulty: "Medium", match: 90,
    reasons: ["Fasting-friendly", "Traditional vrat recipe", "Filling without grains"],
    ingredients: [
      { name: "Sabudana (sago)", qty: "2 cups", category: "Grains" },
      { name: "Potato", qty: "2", category: "Vegetables" },
      { name: "Peanuts", qty: "1/2 cup", category: "Other" },
      { name: "Curd", qty: "1/2 cup", category: "Dairy" },
    ],
    steps: [
      "Soak sabudana in water for 3-4 hours, then drain well.",
      "Roast and coarsely crush peanuts.",
      "Sauté cubed potato in ghee, add sabudana and peanuts.",
      "Cook on low heat until sabudana turns translucent, season with rock salt.",
    ],
  },
  "dal-thali": {
    id: "dal-thali", name: "Dal Tadka + Rice + Aloo Gobi + Roti", emoji: "🍛", mealType: "lunch", diets: ["vegetarian"],
    allergens: ["Dairy", "Gluten"], healthFlags: [],
    prepTime: 10, cookTime: 30, servings: 4, difficulty: "Medium", match: 88,
    reasons: ["Balanced family thali", "Dal not eaten in 4 days", "Fits vegetarian preference"],
    ingredients: [
      { name: "Toor dal", qty: "1 cup", category: "Grains" },
      { name: "Rice", qty: "2 cups", category: "Grains" },
      { name: "Potato", qty: "2", category: "Vegetables" },
      { name: "Cauliflower", qty: "1 small", category: "Vegetables" },
      { name: "Tomato", qty: "2", category: "Vegetables" },
      { name: "Ghee", qty: "2 tbsp", category: "Dairy" },
      { name: "Cumin, turmeric, garam masala", qty: "as needed", category: "Spices" },
    ],
    steps: [
      "Pressure-cook dal with turmeric until soft.",
      "Prepare tadka with cumin, garlic and tomato, mix into dal.",
      "Stir-fry potato and cauliflower with spices for aloo gobi.",
      "Cook rice separately and roll out fresh rotis.",
      "Plate everything together as a thali.",
    ],
  },
  "rajma-rice": {
    id: "rajma-rice", name: "Rajma Rice + Salad", emoji: "🍚", mealType: "lunch", diets: ["vegetarian", "vegan"],
    allergens: [], healthFlags: [],
    prepTime: 10, cookTime: 35, servings: 4, difficulty: "Medium", match: 90,
    reasons: ["A family favourite", "High protein", "Good for a slow Sunday"],
    ingredients: [
      { name: "Rajma (kidney beans)", qty: "1.5 cups", category: "Grains" },
      { name: "Rice", qty: "2 cups", category: "Grains" },
      { name: "Onion", qty: "2", category: "Vegetables" },
      { name: "Tomato", qty: "3", category: "Vegetables" },
      { name: "Cucumber", qty: "1", category: "Vegetables" },
    ],
    steps: [
      "Soak rajma overnight, then pressure-cook until soft.",
      "Prepare a base with onion, tomato and ginger-garlic paste.",
      "Simmer rajma in the base for 15 minutes.",
      "Cook rice and prepare a simple cucumber-onion salad.",
      "Serve rajma over rice with salad on the side.",
    ],
  },
  "fish-curry": {
    id: "fish-curry", name: "Fish Curry + Rice", emoji: "🐟", mealType: "lunch", diets: ["non-vegetarian"],
    allergens: ["Seafood"], healthFlags: [],
    prepTime: 15, cookTime: 25, servings: 4, difficulty: "Medium", match: 91,
    reasons: ["Family's coastal favourite", "Not eaten in over a week", "Pairs well with steamed rice"],
    ingredients: [
      { name: "Fish (rohu/pomfret)", qty: "500g", category: "Other" },
      { name: "Onion", qty: "2", category: "Vegetables" },
      { name: "Tomato", qty: "2", category: "Vegetables" },
      { name: "Mustard oil", qty: "3 tbsp", category: "Other" },
      { name: "Rice", qty: "2 cups", category: "Grains" },
    ],
    steps: [
      "Marinate fish pieces with turmeric and salt, shallow fry lightly.",
      "Prepare a masala base with onion, tomato and ginger-garlic paste.",
      "Simmer the fried fish in the masala for 10 minutes.",
      "Serve hot over steamed rice.",
    ],
  },
  "chana-masala": {
    id: "chana-masala", name: "Chana Masala + Rice (Vegan)", emoji: "🍲", mealType: "lunch", diets: ["vegetarian", "vegan"],
    allergens: [], healthFlags: [],
    prepTime: 10, cookTime: 25, servings: 4, difficulty: "Easy", match: 86,
    reasons: ["Fully plant-based", "High fibre and protein", "Pantry-friendly"],
    ingredients: [
      { name: "Chickpeas", qty: "2 cups (soaked)", category: "Grains" },
      { name: "Onion", qty: "2", category: "Vegetables" },
      { name: "Tomato", qty: "3", category: "Vegetables" },
      { name: "Rice", qty: "2 cups", category: "Grains" },
    ],
    steps: [
      "Pressure-cook chickpeas until soft.",
      "Sauté onion, tomato and spices into a thick masala.",
      "Add chickpeas and simmer for 10 minutes.",
      "Serve hot with steamed rice or roti.",
    ],
  },
  "paneer-bhurji": {
    id: "paneer-bhurji", name: "Paneer Bhurji + Roti + Salad", emoji: "🌙", mealType: "dinner", diets: ["vegetarian"],
    allergens: ["Dairy", "Gluten"], healthFlags: [],
    prepTime: 10, cookTime: 15, servings: 4, difficulty: "Easy", match: 94,
    reasons: ["Family likes paneer", "Not eaten in 5 days", "Fits your 25-minute window"],
    ingredients: [
      { name: "Paneer", qty: "400g", category: "Dairy" },
      { name: "Onion", qty: "2", category: "Vegetables" },
      { name: "Capsicum", qty: "1", category: "Vegetables" },
      { name: "Tomato", qty: "2", category: "Vegetables" },
      { name: "Wheat flour", qty: "2 cups", category: "Grains" },
      { name: "Coriander", qty: "1 bunch", category: "Vegetables" },
    ],
    steps: [
      "Crumble the paneer coarsely.",
      "Sauté onion, capsicum and tomato until soft.",
      "Add spices and crumbled paneer, cook for 5 minutes.",
      "Garnish with coriander and serve with fresh roti and salad.",
    ],
  },
  "veg-pulao": {
    id: "veg-pulao", name: "Vegetable Pulao + Raita", emoji: "🍲", mealType: "dinner", diets: ["vegetarian"],
    allergens: ["Dairy"], healthFlags: [],
    prepTime: 15, cookTime: 25, servings: 4, difficulty: "Easy", match: 87,
    reasons: ["Uses vegetables about to expire", "Lighter dinner option", "One-pot, easy clean-up"],
    ingredients: [
      { name: "Rice", qty: "2 cups", category: "Grains" },
      { name: "Carrot", qty: "1", category: "Vegetables" },
      { name: "Beans", qty: "10", category: "Vegetables" },
      { name: "Green peas", qty: "1/2 cup", category: "Vegetables" },
      { name: "Curd", qty: "1 cup", category: "Dairy" },
      { name: "Whole spices", qty: "as needed", category: "Spices" },
    ],
    steps: [
      "Sauté whole spices, then add chopped vegetables.",
      "Add soaked rice and water, season with salt.",
      "Cook covered until rice is done and fluffy.",
      "Whisk curd with roasted cumin for raita.",
      "Serve pulao hot with raita.",
    ],
  },
  "chicken-curry": {
    id: "chicken-curry", name: "Chicken Curry + Rice/Roti", emoji: "🍗", mealType: "dinner", diets: ["non-vegetarian"],
    allergens: ["Gluten"], healthFlags: [],
    prepTime: 15, cookTime: 35, servings: 4, difficulty: "Medium", match: 95,
    reasons: ["Family's top non-veg pick", "Not eaten in 6 days", "Classic Sunday dinner"],
    ingredients: [
      { name: "Chicken", qty: "800g", category: "Other" },
      { name: "Onion", qty: "3", category: "Vegetables" },
      { name: "Tomato", qty: "3", category: "Vegetables" },
      { name: "Ginger-garlic paste", qty: "2 tbsp", category: "Spices" },
      { name: "Rice or wheat flour", qty: "2 cups", category: "Grains" },
    ],
    steps: [
      "Marinate chicken with ginger-garlic paste, turmeric and salt.",
      "Sauté onions until golden, add tomatoes and spices to build the masala.",
      "Add chicken and cook covered until tender, about 20 minutes.",
      "Simmer to the desired gravy consistency and serve with rice or roti.",
    ],
  },
  "mutton-curry": {
    id: "mutton-curry", name: "Mutton Curry + Rice", emoji: "🍖", mealType: "dinner", diets: ["non-vegetarian"],
    allergens: [], healthFlags: ["high-fat", "fried"],
    prepTime: 20, cookTime: 50, servings: 4, difficulty: "Hard", match: 93,
    reasons: ["Weekend special", "Family's festive favourite", "Rich, slow-cooked flavour"],
    ingredients: [
      { name: "Mutton", qty: "800g", category: "Other" },
      { name: "Onion", qty: "4", category: "Vegetables" },
      { name: "Tomato", qty: "3", category: "Vegetables" },
      { name: "Whole spices", qty: "as needed", category: "Spices" },
      { name: "Rice", qty: "2 cups", category: "Grains" },
    ],
    steps: [
      "Marinate mutton with yogurt, ginger-garlic paste and spices for at least an hour.",
      "Brown onions well, then add tomatoes and whole spices to build the base.",
      "Add mutton and pressure-cook until tender, about 30-40 minutes.",
      "Simmer uncovered to thicken the gravy and serve with steamed rice.",
    ],
  },
  "veg-stirfry": {
    id: "veg-stirfry", name: "Vegetable Stir-fry + Quinoa (Vegan)", emoji: "🥗", mealType: "dinner", diets: ["vegetarian", "vegan"],
    allergens: ["Soy"], healthFlags: [],
    prepTime: 10, cookTime: 15, servings: 4, difficulty: "Easy", match: 82,
    reasons: ["Fully plant-based", "Light evening option", "Ready in 25 minutes"],
    ingredients: [
      { name: "Quinoa", qty: "1.5 cups", category: "Grains" },
      { name: "Broccoli", qty: "1 head", category: "Vegetables" },
      { name: "Capsicum", qty: "1", category: "Vegetables" },
      { name: "Carrot", qty: "1", category: "Vegetables" },
    ],
    steps: [
      "Cook quinoa according to package instructions.",
      "Stir-fry chopped vegetables on high heat with a little oil and garlic.",
      "Season with soy sauce, pepper and a squeeze of lemon.",
      "Serve the stir-fry over the cooked quinoa.",
    ],
  },
  "grilled-paneer-diet": {
    id: "grilled-paneer-diet", name: "Grilled Paneer Tikka + Salad (Diet)", emoji: "🥙", mealType: "dinner", diets: ["diet", "vegetarian"],
    allergens: ["Dairy"], healthFlags: [],
    prepTime: 20, cookTime: 15, servings: 4, difficulty: "Easy", match: 88,
    reasons: ["Low oil, high protein", "Fits a calorie-conscious dinner", "Ready in 35 minutes"],
    ingredients: [
      { name: "Paneer", qty: "400g", category: "Dairy" },
      { name: "Capsicum", qty: "1", category: "Vegetables" },
      { name: "Onion", qty: "1", category: "Vegetables" },
      { name: "Curd", qty: "1/2 cup", category: "Dairy" },
    ],
    steps: [
      "Marinate paneer and vegetable cubes in spiced curd for 20 minutes.",
      "Skewer and grill or pan-sear with minimal oil until charred.",
      "Serve with a fresh cucumber-tomato salad.",
    ],
  },
};

const mealTypeLabel = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const mealTypeEmoji = { breakfast: "🥣", lunch: "🍛", dinner: "🌙" };
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getOptionsForMeal(mealType, diet) {
  const all = Object.values(recipesById).filter((r) => r.mealType === mealType);
  if (diet === "all") return all.map((r) => r.id);
  const filtered = all.filter((r) => r.diets.includes(diet));
  return (filtered.length ? filtered : all).map((r) => r.id);
}

function getMealForPick(mealType, diet, idx) {
  const opts = getOptionsForMeal(mealType, diet);
  const safeIdx = ((idx % opts.length) + opts.length) % opts.length;
  return recipesById[opts[safeIdx]];
}

function makeInitialPlanPicks() {
  return weekDays.map((_, i) => ({ breakfast: i % 2, lunch: i % 2, dinner: i % 2 }));
}

const initialFamilyMembers = [
  { name: "Mom", relation: "Mother", diet: "Vegetarian", ageGroup: "Adult", gender: "female", likes: ["Paneer", "Rajma"], dislikes: ["Karela"], allergies: [], conditions: [], restrictions: [] },
  { name: "Dad", relation: "Father", diet: "Non-vegetarian", ageGroup: "Adult", gender: "male", likes: ["Chicken curry", "Mutton curry"], dislikes: ["Lauki"], allergies: [], conditions: ["High blood pressure"], restrictions: ["Doctor advised: low sodium diet"] },
  { name: "Riya", relation: "Daughter", diet: "Vegetarian", ageGroup: "Teen", gender: "female", likes: ["Pasta", "Paneer"], dislikes: ["Bhindi"], allergies: ["Dairy"], conditions: [], restrictions: [] },
  { name: "Aarav", relation: "Son", diet: "Vegetarian", ageGroup: "Child", gender: "male", likes: ["Rajma", "Maggi"], dislikes: ["Methi"], allergies: ["Nuts"], conditions: [], restrictions: [] },
  { name: "Dadi", relation: "Grandmother", diet: "Vegetarian, mild spice", ageGroup: "Senior", gender: "female", likes: ["Khichdi", "Dal"], dislikes: ["Very spicy food"], allergies: [], conditions: ["Diabetes"], restrictions: ["Doctor advised: avoid sugar and refined carbs"] },
];

const assistantPrompts = [
  { q: "I have leftover dal, what can I make?", a: "With leftover dal you could make Dal Paratha, Dal Cheela, or Dal Pakora — all under 20 minutes." },
  { q: "Plan dinner under ₹200", a: "Vegetable Pulao + Raita fits your budget at roughly ₹160 for the family, using vegetables you already have." },
  { q: "Kids don't want spicy food tonight", a: "Try Paneer Bhurji with less chilli, or a mild Vegetable Pulao — both score well with Riya and Aarav's preferences." },
];

const initialGrocery = {
  Vegetables: [
    { name: "Tomato", qty: "500g", checked: false },
    { name: "Onion", qty: "1kg", checked: false },
    { name: "Capsicum", qty: "2", checked: true },
  ],
  Dairy: [
    { name: "Paneer", qty: "500g", checked: false },
    { name: "Curd", qty: "1 cup", checked: false },
  ],
  Grains: [{ name: "Rice", qty: "2kg", checked: false }],
  Spices: [{ name: "Coriander", qty: "1 bunch", checked: false }],
  Fruits: [],
  Other: [],
};

// ---------------- shared bits (top-level, stable identity) ----------------
function TopBar({ title, onBack }) {
  return (
    <div style={{ ...sans, display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 10px" }}>
      {onBack && (
        <button onClick={onBack} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 6, cursor: "pointer", display: "flex" }}>
          <ArrowLeft size={18} color={colors.ink} />
        </button>
      )}
      <h2 style={{ ...serif, fontSize: 19, color: colors.ink, margin: 0 }}>{title}</h2>
    </div>
  );
}

function Pill({ children, bg, color }) {
  return (
    <span style={{ ...sans, background: bg, color, fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function DietChips({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 12px" }}>
      {dietOrder.map((d) => {
        const meta = dietMeta[d];
        const active = value === d;
        return (
          <button
            type="button"
            key={d}
            onClick={() => onChange(d)}
            style={{
              ...sans, whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 999, cursor: "pointer",
              border: "none",
              background: active ? meta.bg : "transparent",
              color: active ? meta.color : colors.inkSoft,
            }}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function HealthWarnings({ warnings }) {
  if (!warnings.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      {warnings.map((w, i) => (
        <div
          key={i}
          style={{
            display: "flex", gap: 7, alignItems: "flex-start",
            background: w.severity === "allergy" ? colors.dislikeSoft : colors.goldSoft,
            borderRadius: 10, padding: "9px 11px", marginBottom: 6,
          }}
        >
          <AlertTriangle size={14} color={w.severity === "allergy" ? colors.dislike : colors.gold} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ ...sans, fontSize: 12.5, color: colors.ink, lineHeight: 1.4 }}>{w.text}</span>
        </div>
      ))}
    </div>
  );
}

function MealCard({ mealType, diet, pickIdx, familyMembers, onChange, onView, onVote }) {
  const meal = getMealForPick(mealType, diet, pickIdx);
  const warnings = getHealthWarnings(meal, familyMembers);
  const hasAllergy = warnings.some((w) => w.severity === "allergy");
  return (
    <div style={{ background: colors.card, borderRadius: 20, boxShadow: colors.shadow, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            width: 58, height: 58, borderRadius: 16, flexShrink: 0,
            background: `linear-gradient(150deg, ${colors.goldSoft}, #F3D9A4)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          }}
        >
          {meal.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...sans, fontSize: 11.5, color: colors.inkSoft, margin: 0, fontWeight: 600 }}>
            {mealTypeLabel[mealType]}
          </p>
          <h3 style={{ ...serif, fontSize: 17, color: colors.ink, margin: "2px 0 7px", lineHeight: 1.25 }}>{meal.name}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...sans, fontSize: 12, color: colors.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={13} /> {meal.prepTime >= 60 ? Math.round(meal.prepTime / 60) + " hr" : meal.prepTime + " min"} prep
            </span>
            <span style={{ ...sans, fontSize: 12, color: colors.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
              <Flame size={13} /> {meal.difficulty}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            <Pill bg={colors.secondarySoft} color={colors.secondary}>{meal.match}% match ❤️</Pill>
            {meal.diets.map((d) => (
              <Pill key={d} bg={dietMeta[d].bg} color={dietMeta[d].color}>{dietMeta[d].label}</Pill>
            ))}
            {warnings.length > 0 && (
              <Pill bg={hasAllergy ? colors.dislikeSoft : colors.goldSoft} color={hasAllergy ? colors.dislike : colors.gold}>
                ⚠ {warnings.length} health note{warnings.length > 1 ? "s" : ""}
              </Pill>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => onView(meal)}
          style={{ ...sans, flex: 1, background: colors.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          View recipe
        </button>
        <button
          type="button"
          onClick={() => onChange(mealType)}
          style={{ ...sans, flex: 1, background: "#fff", color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Change
        </button>
        <button
          type="button"
          onClick={() => onVote(mealType)}
          style={{ ...sans, flex: 1, background: "#fff", color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
        >
          <ThumbsUp size={14} /> Vote
        </button>
      </div>
    </div>
  );
}

function HomeScreen({
  accountName, editingName, draftName, onStartEdit, onDraftChange, onSaveName,
  timeChoice, onSetTime, diet, onSetDiet, picks, familyMembers, onChangeMeal, onViewRecipe, onVoteMeal,
}) {
  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDeep})`, padding: "26px 20px 34px", borderRadius: "0 0 28px 28px" }}>
        <p style={{ ...sans, fontSize: 13, color: "rgba(255,255,255,0.75)", margin: 0 }}>Saturday, 5 September</p>
        {!editingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <h1 style={{ ...serif, fontSize: 27, color: "#fff", margin: 0 }}>Good morning, {accountName} 👋</h1>
            <button type="button" onClick={onStartEdit} style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 8, padding: 5, cursor: "pointer", display: "flex" }}>
              <Pencil size={13} color="#fff" />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSaveName()}
              style={{ ...sans, fontSize: 15, padding: "8px 12px", borderRadius: 10, border: "none", outline: "none", flex: 1 }}
              placeholder="Your name"
            />
            <button type="button" onClick={onSaveName} style={{ background: "#fff", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", display: "flex" }}>
              <CheckIcon size={16} color={colors.primary} />
            </button>
          </div>
        )}
        <p style={{ ...sans, fontSize: 12, color: "rgba(255,255,255,0.65)", margin: "6px 0 0" }}>
          Name syncs from your account — tap the pencil to change it here.
        </p>
      </div>

      <div style={{ padding: "0 20px", marginTop: -18 }}>
        <div style={{ background: colors.card, borderRadius: 16, boxShadow: colors.shadow, overflow: "hidden" }}>
          <div style={{ padding: "10px 4px 0 12px" }}>
            <p style={{ ...sans, fontSize: 11, fontWeight: 700, color: colors.inkSoft, margin: 0, textTransform: "uppercase", letterSpacing: 0.3 }}>Family diet today</p>
          </div>
          <DietChips value={diet} onChange={onSetDiet} />
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            <div style={{ padding: "10px 4px 0 12px" }}>
              <p style={{ ...sans, fontSize: 11, fontWeight: 700, color: colors.inkSoft, margin: 0, textTransform: "uppercase", letterSpacing: 0.3 }}>Cooking time</p>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 12px 12px" }}>
              {["15 min", "30 min", "45 min", "1 hr+", "No preference"].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => onSetTime(t)}
                  style={{
                    ...sans, whiteSpace: "nowrap", fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 999, cursor: "pointer",
                    border: "none",
                    background: timeChoice === t ? colors.primarySoft : "transparent",
                    color: timeChoice === t ? colors.primary : colors.inkSoft,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 100px" }}>
        <h2 style={{ ...serif, fontSize: 18, color: colors.ink, margin: "0 0 12px" }}>Today's family menu</h2>
        <MealCard mealType="breakfast" diet={diet} pickIdx={picks.breakfast} familyMembers={familyMembers} onChange={onChangeMeal} onView={onViewRecipe} onVote={onVoteMeal} />
        <MealCard mealType="lunch" diet={diet} pickIdx={picks.lunch} familyMembers={familyMembers} onChange={onChangeMeal} onView={onViewRecipe} onVote={onVoteMeal} />
        <MealCard mealType="dinner" diet={diet} pickIdx={picks.dinner} familyMembers={familyMembers} onChange={onChangeMeal} onView={onViewRecipe} onVote={onVoteMeal} />
      </div>
    </div>
  );
}

function PlannerScreen({ plan, planPicks, diet, onSetDiet, weekDay, onSetWeekDay, onCyclePlanMeal, onToggleLock, onGenerateGrocery }) {
  const day = plan[weekDay];
  const picks = planPicks[weekDay];
  return (
    <div>
      <TopBar title="Weekly planner" />
      <div style={{ padding: "0 20px 6px" }}>
        <div style={{ background: colors.card, borderRadius: 14, boxShadow: colors.shadow, overflow: "hidden", marginBottom: 12 }}>
          <DietChips value={diet} onChange={onSetDiet} />
        </div>
      </div>
      <div style={{ padding: "0 20px 12px", display: "flex", gap: 8, overflowX: "auto" }}>
        {weekDays.map((w, i) => (
          <button
            type="button"
            key={w}
            onClick={() => onSetWeekDay(i)}
            style={{
              ...sans, fontSize: 13, fontWeight: 700, padding: "8px 15px", borderRadius: 999, cursor: "pointer", flexShrink: 0,
              border: "none",
              background: weekDay === i ? colors.secondary : colors.card,
              color: weekDay === i ? "#fff" : colors.inkSoft,
              boxShadow: weekDay === i ? "none" : colors.shadow,
            }}
          >
            {w}
          </button>
        ))}
      </div>
      <div style={{ padding: "0 20px" }}>
        {["breakfast", "lunch", "dinner"].map((mt) => {
          const meal = getMealForPick(mt, diet, picks[mt]);
          return (
            <div key={mt} style={{ background: colors.card, boxShadow: colors.shadow, borderRadius: 16, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {mealTypeEmoji[mt]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...sans, fontSize: 11.5, color: colors.inkSoft, margin: 0, fontWeight: 600 }}>{mealTypeLabel[mt]}</p>
                <p style={{ ...serif, fontSize: 15, color: colors.ink, margin: "2px 0 0" }}>{meal.name}</p>
              </div>
              <button
                type="button"
                onClick={() => onCyclePlanMeal(weekDay, mt)}
                disabled={day.locked}
                style={{
                  ...sans, fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 10, cursor: day.locked ? "not-allowed" : "pointer",
                  background: day.locked ? colors.border : colors.primarySoft,
                  color: day.locked ? colors.inkSoft : colors.primary, border: "none", flexShrink: 0,
                }}
              >
                Change
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onToggleLock(weekDay)}
          style={{ ...sans, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: colors.inkSoft, background: "none", border: "none", cursor: "pointer", padding: "4px 0 18px", fontWeight: 600 }}
        >
          {day.locked ? <Lock size={15} /> : <Unlock size={15} />} {day.locked ? "Day locked — tap to unlock" : "Lock this day"}
        </button>
        <button
          type="button"
          onClick={onGenerateGrocery}
          style={{ ...sans, width: "100%", background: colors.primary, color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 90, boxShadow: "0 8px 18px rgba(193,68,14,0.28)" }}
        >
          Generate grocery list for the week
        </button>
      </div>
    </div>
  );
}

function GroceryScreen({ grocery, onToggleItem }) {
  const flat = Object.values(grocery).flat();
  const total = flat.length;
  const done = flat.filter((i) => i.checked).length;
  return (
    <div>
      <TopBar title="Grocery list" />
      <div style={{ padding: "0 20px 6px" }}>
        <p style={{ ...sans, fontSize: 13, color: colors.inkSoft, margin: "0 0 14px", fontWeight: 600 }}>{done} of {total} items purchased</p>
      </div>
      <div style={{ padding: "0 20px 100px" }}>
        {Object.entries(grocery).map(([cat, items]) =>
          items.length ? (
            <div key={cat} style={{ marginBottom: 16 }}>
              <p style={{ ...sans, fontSize: 12, fontWeight: 700, color: colors.secondary, margin: "0 0 8px" }}>{cat}</p>
              <div style={{ background: colors.card, borderRadius: 16, boxShadow: colors.shadow, padding: "4px 14px" }}>
                {items.map((item, idx) => (
                  <div
                    key={item.name}
                    onClick={() => onToggleItem(cat, idx)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: idx < items.length - 1 ? `1px solid ${colors.border}` : "none", cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${item.checked ? colors.secondary : colors.border}`,
                        background: item.checked ? colors.secondary : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      {item.checked && <Check size={13} color="#fff" />}
                    </div>
                    <span style={{ ...sans, fontSize: 14, color: item.checked ? colors.inkSoft : colors.ink, textDecoration: item.checked ? "line-through" : "none", flex: 1 }}>
                      {item.name}
                    </span>
                    <span style={{ ...sans, fontSize: 13, color: colors.inkSoft }}>{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
        {total === 0 && <p style={{ ...sans, fontSize: 14, color: colors.inkSoft }}>Your list is empty. Add ingredients from any recipe.</p>}
      </div>
    </div>
  );
}

function MacroBar({ label, grams, pct, color, bg }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ ...sans, fontSize: 13, fontWeight: 700, color: colors.ink }}>{label}</span>
        <span style={{ ...sans, fontSize: 12, color: colors.inkSoft }}>{grams}g · {pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: bg, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function NutritionScreen({ member, onBack }) {
  const calories = getCalorieTarget(member.ageGroup, member.gender);
  const macros = getMacroSplit(member);
  const proteinG = Math.round((calories * macros.protein) / 100 / 4);
  const carbsG = Math.round((calories * macros.carbs) / 100 / 4);
  const fatG = Math.round((calories * macros.fat) / 100 / 9);
  const notes = getNutritionNotes(member);
  const plate = plateGuide[member.ageGroup] || plateGuide.Adult;
  const mealSplit = [
    { label: "Breakfast", pct: 25 },
    { label: "Lunch", pct: 35 },
    { label: "Dinner", pct: 30 },
    { label: "Snacks", pct: 10 },
  ];
  const plateRows = [
    { icon: "🌾", label: "Grains", value: plate.grains },
    { icon: "🍗", label: "Protein", value: plate.protein },
    { icon: "🥦", label: "Vegetables", value: plate.vegetables },
    { icon: "🍎", label: "Fruits", value: plate.fruits },
    { icon: "🥛", label: "Dairy", value: plate.dairy },
    { icon: "💧", label: "Water", value: plate.water },
  ];

  return (
    <div>
      <TopBar title={`${member.name}'s nutrition plan`} onBack={onBack} />
      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ background: `linear-gradient(135deg, ${colors.secondary}, #365F45)`, borderRadius: 20, padding: 20, marginBottom: 18, textAlign: "center" }}>
          <p style={{ ...sans, fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0 }}>
            {member.ageGroup} · {member.gender === "male" ? "Male" : "Female"}
          </p>
          <p style={{ ...serif, fontSize: 36, color: "#fff", margin: "4px 0 0" }}>{calories}</p>
          <p style={{ ...sans, fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0 }}>kcal recommended per day</p>
        </div>

        <h3 style={{ ...serif, fontSize: 16, color: colors.ink, margin: "0 0 12px" }}>Daily macros</h3>
        <MacroBar label="Protein" grams={proteinG} pct={macros.protein} color={colors.secondary} bg={colors.secondarySoft} />
        <MacroBar label="Carbohydrates" grams={carbsG} pct={macros.carbs} color={colors.gold} bg={colors.goldSoft} />
        <MacroBar label="Fat" grams={fatG} pct={macros.fat} color={colors.primary} bg={colors.primarySoft} />

        <h3 style={{ ...serif, fontSize: 16, color: colors.ink, margin: "18px 0 12px" }}>Calories by meal</h3>
        <div style={{ background: colors.card, boxShadow: colors.shadow, borderRadius: 16, padding: "4px 14px", marginBottom: 18 }}>
          {mealSplit.map((m, i) => (
            <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < mealSplit.length - 1 ? `1px solid ${colors.border}` : "none" }}>
              <span style={{ ...sans, fontSize: 14, color: colors.ink }}>{m.label}</span>
              <span style={{ ...sans, fontSize: 13, color: colors.inkSoft }}>~{Math.round((calories * m.pct) / 100)} kcal</span>
            </div>
          ))}
        </div>

        <h3 style={{ ...serif, fontSize: 16, color: colors.ink, margin: "0 0 12px" }}>Suggested daily plate</h3>
        <div style={{ background: colors.card, boxShadow: colors.shadow, borderRadius: 16, padding: 14, marginBottom: 18 }}>
          {plateRows.map((row) => (
            <div key={row.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0" }}>
              <span style={{ fontSize: 18 }}>{row.icon}</span>
              <div>
                <p style={{ ...sans, fontSize: 12, fontWeight: 700, color: colors.inkSoft, margin: 0 }}>{row.label}</p>
                <p style={{ ...sans, fontSize: 13.5, color: colors.ink, margin: "2px 0 0" }}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {notes.length > 0 && (
          <>
            <h3 style={{ ...serif, fontSize: 16, color: colors.ink, margin: "0 0 12px" }}>Personalized notes</h3>
            <div style={{ marginBottom: 18 }}>
              {notes.map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", background: colors.goldSoft, borderRadius: 10, padding: "9px 11px", marginBottom: 6 }}>
                  <AlertTriangle size={14} color={colors.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ ...sans, fontSize: 12.5, color: colors.ink, lineHeight: 1.4 }}>{n}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ background: colors.border, borderRadius: 12, padding: 12 }}>
          <p style={{ ...sans, fontSize: 11.5, color: colors.inkSoft, margin: 0, lineHeight: 1.5 }}>
            This is a general wellness guide based on age and activity averages, not a clinical diet prescription. Please consult a registered dietitian or your doctor for a plan tailored to lab reports and medical history.
          </p>
        </div>
      </div>
    </div>
  );
}

function FamilyScreen({ members, editingIdx, onToggleEdit, onToggleTag, restrictionDrafts, onDraftChange, onAddRestriction, onRemoveRestriction, onViewNutrition }) {
  return (
    <div>
      <TopBar title="Family" />
      <div style={{ padding: "0 20px 10px" }}>
        <p style={{ ...sans, fontSize: 13, color: colors.inkSoft, margin: 0, lineHeight: 1.5 }}>
          Add allergies, health conditions, or a doctor's restrictions here so meals can be flagged before anyone starts cooking.
        </p>
      </div>
      <div style={{ padding: "0 20px 100px" }}>
        {members.map((m, idx) => {
          const editing = editingIdx === idx;
          const hasHealthInfo = m.allergies.length > 0 || m.conditions.length > 0 || m.restrictions.length > 0;
          return (
            <div key={m.name} style={{ background: colors.card, boxShadow: colors.shadow, borderRadius: 18, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ ...serif, fontSize: 17, color: colors.ink, margin: 0 }}>{m.name}</h3>
                <span style={{ ...sans, fontSize: 12, color: colors.inkSoft }}>{m.relation}</span>
              </div>
              <p style={{ ...sans, fontSize: 12, color: colors.inkSoft, margin: "4px 0 10px" }}>{m.diet}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {m.likes.map((l) => <Pill key={l} bg={colors.secondarySoft} color={colors.secondary}>♥ {l}</Pill>)}
                {m.dislikes.map((l) => <Pill key={l} bg={colors.dislikeSoft} color={colors.dislike}>✕ {l}</Pill>)}
              </div>

              {hasHealthInfo && (
                <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 10, paddingTop: 10 }}>
                  {m.allergies.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: colors.dislike, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Allergies</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {m.allergies.map((a) => <Pill key={a} bg={colors.dislikeSoft} color={colors.dislike}>⚠ {a}</Pill>)}
                      </div>
                    </div>
                  )}
                  {m.conditions.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: colors.gold, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Health conditions</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {m.conditions.map((c) => <Pill key={c} bg={colors.goldSoft} color={colors.gold}>{c}</Pill>)}
                      </div>
                    </div>
                  )}
                  {m.restrictions.length > 0 && (
                    <div>
                      <p style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: colors.primary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Doctor's notes</p>
                      {m.restrictions.map((r, ri) => (
                        <p key={ri} style={{ ...sans, fontSize: 12.5, color: colors.ink, margin: "2px 0" }}>• {r}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => onToggleEdit(idx)}
                  style={{ ...sans, fontSize: 12, fontWeight: 700, color: colors.primary, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {editing ? "Done editing" : "Edit health info"}
                </button>
                <button
                  type="button"
                  onClick={() => onViewNutrition(idx)}
                  style={{ ...sans, fontSize: 12, fontWeight: 700, color: colors.secondary, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Activity size={13} /> View nutrition plan
                </button>
              </div>

              {editing && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
                  <p style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: colors.inkSoft, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.4 }}>Allergies</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {allergensList.map((a) => {
                      const active = m.allergies.includes(a);
                      return (
                        <button
                          type="button" key={a} onClick={() => onToggleTag(idx, "allergies", a)}
                          style={{ ...sans, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: active ? "none" : `1px solid ${colors.border}`, background: active ? colors.dislikeSoft : "#fff", color: active ? colors.dislike : colors.inkSoft }}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>

                  <p style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: colors.inkSoft, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.4 }}>Health conditions</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {conditionsList.map((c) => {
                      const active = m.conditions.includes(c);
                      return (
                        <button
                          type="button" key={c} onClick={() => onToggleTag(idx, "conditions", c)}
                          style={{ ...sans, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: active ? "none" : `1px solid ${colors.border}`, background: active ? colors.goldSoft : "#fff", color: active ? colors.gold : colors.inkSoft }}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>

                  <p style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: colors.inkSoft, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.4 }}>Doctor's restrictions</p>
                  {m.restrictions.map((r, ri) => (
                    <div key={ri} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ ...sans, fontSize: 12.5, color: colors.ink, flex: 1 }}>{r}</span>
                      <button type="button" onClick={() => onRemoveRestriction(idx, ri)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                        <X size={14} color={colors.inkSoft} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      value={restrictionDrafts[idx] || ""}
                      onChange={(e) => onDraftChange(idx, e.target.value)}
                      placeholder="e.g. Doctor advised: no fried food"
                      style={{ ...sans, flex: 1, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, outline: "none" }}
                    />
                    <button type="button" onClick={() => onAddRestriction(idx)} style={{ background: colors.secondary, border: "none", borderRadius: 10, width: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Plus size={16} color="#fff" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecipesScreen({ diet, onSetDiet, onSelect }) {
  const all = Object.values(recipesById).filter((r) => diet === "all" || r.diets.includes(diet));
  return (
    <div>
      <TopBar title="Recipes" />
      <div style={{ padding: "0 20px 6px" }}>
        <div style={{ background: colors.card, borderRadius: 14, boxShadow: colors.shadow, overflow: "hidden", marginBottom: 12 }}>
          <DietChips value={diet} onChange={onSetDiet} />
        </div>
      </div>
      <div style={{ padding: "0 20px 100px" }}>
        {all.map((r) => (
          <div
            key={r.id}
            onClick={() => onSelect(r)}
            style={{ display: "flex", alignItems: "center", gap: 12, background: colors.card, boxShadow: colors.shadow, borderRadius: 16, padding: 12, marginBottom: 10, cursor: "pointer" }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 12, background: colors.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {r.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ ...serif, fontSize: 15, color: colors.ink, margin: 0 }}>{r.name}</p>
              <p style={{ ...sans, fontSize: 12, color: colors.inkSoft, margin: "2px 0 0" }}>
                {mealTypeLabel[r.mealType]} · {r.difficulty}
              </p>
            </div>
          </div>
        ))}
        {all.length === 0 && <p style={{ ...sans, fontSize: 14, color: colors.inkSoft }}>No recipes tagged for this filter yet.</p>}
      </div>
    </div>
  );
}

function RecipeDetail({ recipe, familyMembers, onBack, onAddToGrocery, cooked, onMarkCooked }) {
  const warnings = getHealthWarnings(recipe, familyMembers);
  return (
    <div>
      <TopBar title="Recipe" onBack={onBack} />
      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ width: "100%", height: 150, borderRadius: 18, background: `linear-gradient(150deg, ${colors.goldSoft}, #F3D9A4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 58, marginBottom: 14 }}>
          {recipe.emoji}
        </div>
        <h2 style={{ ...serif, fontSize: 22, color: colors.ink, margin: "0 0 8px" }}>{recipe.name}</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {recipe.diets.map((d) => (
            <Pill key={d} bg={dietMeta[d].bg} color={dietMeta[d].color}>{dietMeta[d].label}</Pill>
          ))}
          {recipe.allergens.map((a) => (
            <Pill key={a} bg={colors.border} color={colors.inkSoft}>Contains {a}</Pill>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ ...sans, fontSize: 12, color: colors.inkSoft }}>Prep {recipe.prepTime >= 60 ? Math.round(recipe.prepTime / 60) + " hr" : recipe.prepTime + " min"}</span>
          <span style={{ ...sans, fontSize: 12, color: colors.inkSoft }}>Cook {recipe.cookTime} min</span>
          <span style={{ ...sans, fontSize: 12, color: colors.inkSoft }}>Serves {recipe.servings}</span>
          <span style={{ ...sans, fontSize: 12, color: colors.inkSoft }}>{recipe.difficulty}</span>
        </div>

        <HealthWarnings warnings={warnings} />

        <div style={{ background: colors.secondarySoft, borderRadius: 14, padding: 14, margin: "10px 0 18px" }}>
          <p style={{ ...sans, fontSize: 13, fontWeight: 700, color: colors.secondary, margin: "0 0 6px" }}>{recipe.match}% family match</p>
          {recipe.reasons.map((r) => (
            <p key={r} style={{ ...sans, fontSize: 13, color: colors.ink, margin: "2px 0" }}>✓ {r}</p>
          ))}
        </div>

        <h3 style={{ ...serif, fontSize: 16, color: colors.ink, margin: "0 0 8px" }}>Ingredients</h3>
        {recipe.ingredients.map((i) => (
          <div key={i.name} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${colors.border}` }}>
            <span style={{ ...sans, fontSize: 14, color: colors.ink }}>{i.name}</span>
            <span style={{ ...sans, fontSize: 13, color: colors.inkSoft }}>{i.qty}</span>
          </div>
        ))}

        <h3 style={{ ...serif, fontSize: 16, color: colors.ink, margin: "18px 0 8px" }}>Instructions</h3>
        {recipe.steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: colors.primarySoft, color: colors.primary, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {i + 1}
            </div>
            <p style={{ ...sans, fontSize: 14, color: colors.ink, margin: 0, lineHeight: 1.5 }}>{s}</p>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => onAddToGrocery(recipe)}
            style={{ ...sans, flex: 1, background: "#fff", color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Add to grocery list
          </button>
          <button
            type="button"
            onClick={onMarkCooked}
            style={{ ...sans, flex: 1, background: cooked ? colors.secondary : colors.primary, color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {cooked ? "Cooked today ✓" : "Cooked this today"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VotingScreen({ mealType, options, myVoteId, onVote, onBack, suggestionText, onSuggestionChange, onAddSuggestion }) {
  const sorted = [...options].sort((a, b) => b.votes - a.votes);
  const leader = sorted[0];
  return (
    <div>
      <TopBar title={`Vote: ${mealTypeLabel[mealType]}`} onBack={onBack} />
      <div style={{ padding: "0 20px 20px" }}>
        <p style={{ ...sans, fontSize: 14, color: colors.inkSoft, margin: "0 0 16px" }}>
          What should we have for {mealTypeLabel[mealType].toLowerCase()}?
        </p>
        {sorted.map((o) => {
          const mine = myVoteId === o.id;
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, background: mine ? colors.primarySoft : colors.card, boxShadow: mine ? "none" : colors.shadow, borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{mealTypeEmoji[mealType]}</span>
              <div style={{ flex: 1 }}>
                <p style={{ ...serif, fontSize: 15, color: colors.ink, margin: 0 }}>{o.name}</p>
                <p style={{ ...sans, fontSize: 12, color: colors.inkSoft, margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                  <ThumbsUp size={12} /> {o.votes} vote{o.votes !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onVote(mealType, o.id)}
                style={{
                  ...sans, fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                  border: "none",
                  background: mine ? colors.primary : colors.bg, color: mine ? "#fff" : colors.ink,
                }}
              >
                {mine ? "Voted" : "Vote"}
              </button>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
          <input
            value={suggestionText}
            onChange={(e) => onSuggestionChange(e.target.value)}
            placeholder="Suggest another meal, e.g. Chole Bhature"
            style={{ ...sans, flex: 1, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none" }}
          />
          <button
            type="button"
            onClick={() => onAddSuggestion(mealType, suggestionText)}
            style={{ background: colors.secondary, border: "none", borderRadius: 10, width: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Plus size={18} color="#fff" />
          </button>
        </div>

        {leader && (
          <div style={{ background: colors.goldSoft, borderRadius: 14, padding: 14, textAlign: "center" }}>
            <p style={{ ...sans, fontSize: 13, color: colors.ink, margin: 0 }}>
              Current family choice: <strong>{leader.name}</strong> ❤️
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantPanel({ onClose, answer, onAsk, onReset }) {
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, bottom: 78, margin: "0 14px",
        background: colors.card, borderRadius: 18, boxShadow: "0 12px 28px rgba(43,27,18,0.22)", padding: 16, zIndex: 30,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ ...serif, fontSize: 15, color: colors.ink, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={15} color={colors.primary} /> Ask KhaanaKyaHai
        </p>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <X size={18} color={colors.inkSoft} />
        </button>
      </div>

      {!answer ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assistantPrompts.map((p) => (
            <button
              type="button"
              key={p.q}
              onClick={() => onAsk(p.a)}
              style={{ ...sans, textAlign: "left", fontSize: 13, color: colors.ink, background: colors.bg, border: "none", borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}
            >
              {p.q}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ background: colors.secondarySoft, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <p style={{ ...sans, fontSize: 13, color: colors.ink, margin: 0, lineHeight: 1.5 }}>{answer}</p>
          </div>
          <button type="button" onClick={onReset} style={{ ...sans, fontSize: 12, color: colors.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
            ← Ask something else
          </button>
        </div>
      )}
    </div>
  );
}

const navItems = [
  { key: "home", label: "Home", icon: Home },
  { key: "planner", label: "Planner", icon: CalendarDays },
  { key: "grocery", label: "Grocery", icon: ShoppingCart },
  { key: "family", label: "Family", icon: Users },
  { key: "recipes", label: "Recipes", icon: UtensilsCrossed },
];

// ---------------- root app (owns state only) ----------------
export default function App() {
  const [screen, setScreen] = useState("home");
  const [activeRecipeId, setActiveRecipeId] = useState(null);
  const [votingMeal, setVotingMeal] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantAnswer, setAssistantAnswer] = useState(null);
  const [toast, setToast] = useState(null);
  const [timeChoice, setTimeChoice] = useState("30 min");
  const [diet, setDiet] = useState("all");
  const [weekDay, setWeekDay] = useState(0);
  const [suggestionText, setSuggestionText] = useState("");
  const [cookedMap, setCookedMap] = useState({});

  // account / auth-derived display name — in production this reads the
  // signed-in user's Firebase Auth displayName instead of local state
  const [accountName, setAccountName] = useState("Rani");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("Rani");

  const [picks, setPicks] = useState({ breakfast: 0, lunch: 0, dinner: 0 });
  const [planPicks, setPlanPicks] = useState(makeInitialPlanPicks());
  const [plan, setPlan] = useState(weekDays.map(() => ({ locked: false })));

  const [votes, setVotes] = useState({
    breakfast: [{ id: "poha", name: "Poha + Curd", votes: 2 }, { id: "paratha", name: "Aloo Paratha", votes: 1 }],
    lunch: [{ id: "dal-thali", name: "Dal Tadka Thali", votes: 1 }, { id: "rajma-rice", name: "Rajma Rice", votes: 2 }],
    dinner: [{ id: "paneer-bhurji", name: "Paneer Bhurji", votes: 3 }, { id: "chicken-curry", name: "Chicken Curry", votes: 1 }, { id: "veg-pulao", name: "Vegetable Pulao", votes: 2 }],
  });
  const [myVote, setMyVote] = useState({ breakfast: "poha", lunch: "rajma-rice", dinner: "paneer-bhurji" });
  const [grocery, setGrocery] = useState(initialGrocery);

  const [familyMembers, setFamilyMembers] = useState(initialFamilyMembers);
  const [editingMemberIdx, setEditingMemberIdx] = useState(null);
  const [restrictionDrafts, setRestrictionDrafts] = useState({});
  const [nutritionMemberIdx, setNutritionMemberIdx] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function changeMeal(mealType) {
    setPicks((p) => ({ ...p, [mealType]: p[mealType] + 1 }));
  }

  function cyclePlanMeal(dayIdx, mealType) {
    setPlanPicks((prev) => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], [mealType]: next[dayIdx][mealType] + 1 };
      return next;
    });
  }

  function toggleLock(dayIdx) {
    setPlan((p) => p.map((d, i) => (i === dayIdx ? { ...d, locked: !d.locked } : d)));
  }

  function castVote(mealType, optionId) {
    const previous = myVote[mealType];
    if (previous === optionId) return;
    setVotes((v) => ({
      ...v,
      [mealType]: v[mealType].map((o) => {
        let count = o.votes;
        if (o.id === previous) count -= 1;
        if (o.id === optionId) count += 1;
        return { ...o, votes: count };
      }),
    }));
    setMyVote((prev) => ({ ...prev, [mealType]: optionId }));
  }

  function addSuggestionToVote(mealType, name) {
    if (!name.trim()) return;
    const id = "custom-" + Date.now();
    setVotes((v) => ({ ...v, [mealType]: [...v[mealType], { id, name: name.trim(), votes: 0 }] }));
    setSuggestionText("");
    showToast(`Added "${name.trim()}" to tonight's choices`);
  }

  function addToGrocery(recipe) {
    setGrocery((prev) => {
      const next = { ...prev };
      recipe.ingredients.forEach((ing) => {
        const cat = ing.category;
        const list = next[cat] ? [...next[cat]] : [];
        const exists = list.find((i) => i.name.toLowerCase() === ing.name.toLowerCase());
        if (!exists) list.push({ name: ing.name, qty: ing.qty, checked: false });
        next[cat] = list;
      });
      return next;
    });
    showToast(`Added ${recipe.name} ingredients to your grocery list`);
  }

  function toggleGroceryItem(cat, idx) {
    setGrocery((prev) => {
      const list = [...prev[cat]];
      list[idx] = { ...list[idx], checked: !list[idx].checked };
      return { ...prev, [cat]: list };
    });
  }

  function saveName() {
    const trimmed = draftName.trim();
    setAccountName(trimmed || "Rani");
    setEditingName(false);
  }

  function toggleMemberTag(idx, field, value) {
    setFamilyMembers((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m;
        const has = m[field].includes(value);
        return { ...m, [field]: has ? m[field].filter((v) => v !== value) : [...m[field], value] };
      })
    );
  }

  function addRestriction(idx) {
    const text = (restrictionDrafts[idx] || "").trim();
    if (!text) return;
    setFamilyMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, restrictions: [...m.restrictions, text] } : m)));
    setRestrictionDrafts((prev) => ({ ...prev, [idx]: "" }));
  }

  function removeRestriction(idx, ri) {
    setFamilyMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, restrictions: m.restrictions.filter((_, x) => x !== ri) } : m)));
  }

  const activeRecipe = activeRecipeId ? recipesById[activeRecipeId] : null;
  const overlay = activeRecipe || votingMeal || nutritionMemberIdx !== null;

  return (
    <div style={{ ...sans, background: "#EFE6D6", minHeight: "100vh", padding: "24px 0" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 420, margin: "0 auto", position: "relative" }}>
        <div style={{ background: colors.bg, borderRadius: 32, overflow: "hidden", boxShadow: "0 20px 50px rgba(43,27,18,0.25)", position: "relative" }}>
          <div style={{ minHeight: 760, maxHeight: 760, overflowY: "auto", position: "relative" }}>
            {activeRecipe ? (
              <RecipeDetail
                recipe={activeRecipe}
                familyMembers={familyMembers}
                onBack={() => setActiveRecipeId(null)}
                onAddToGrocery={addToGrocery}
                cooked={!!cookedMap[activeRecipe.id]}
                onMarkCooked={() => {
                  setCookedMap((m) => ({ ...m, [activeRecipe.id]: true }));
                  showToast("Marked as cooked today 🎉");
                }}
              />
            ) : nutritionMemberIdx !== null ? (
              <NutritionScreen member={familyMembers[nutritionMemberIdx]} onBack={() => setNutritionMemberIdx(null)} />
            ) : votingMeal ? (
              <VotingScreen
                mealType={votingMeal}
                options={votes[votingMeal]}
                myVoteId={myVote[votingMeal]}
                onVote={castVote}
                onBack={() => setVotingMeal(null)}
                suggestionText={suggestionText}
                onSuggestionChange={setSuggestionText}
                onAddSuggestion={addSuggestionToVote}
              />
            ) : screen === "home" ? (
              <HomeScreen
                accountName={accountName}
                editingName={editingName}
                draftName={draftName}
                onStartEdit={() => { setDraftName(accountName); setEditingName(true); }}
                onDraftChange={setDraftName}
                onSaveName={saveName}
                timeChoice={timeChoice}
                onSetTime={setTimeChoice}
                diet={diet}
                onSetDiet={setDiet}
                picks={picks}
                familyMembers={familyMembers}
                onChangeMeal={changeMeal}
                onViewRecipe={(meal) => setActiveRecipeId(meal.id)}
                onVoteMeal={setVotingMeal}
              />
            ) : screen === "planner" ? (
              <PlannerScreen
                plan={plan}
                planPicks={planPicks}
                diet={diet}
                onSetDiet={setDiet}
                weekDay={weekDay}
                onSetWeekDay={setWeekDay}
                onCyclePlanMeal={cyclePlanMeal}
                onToggleLock={toggleLock}
                onGenerateGrocery={() => showToast("Grocery list generated for the week")}
              />
            ) : screen === "grocery" ? (
              <GroceryScreen grocery={grocery} onToggleItem={toggleGroceryItem} />
            ) : screen === "family" ? (
              <FamilyScreen
                members={familyMembers}
                editingIdx={editingMemberIdx}
                onToggleEdit={(idx) => setEditingMemberIdx(editingMemberIdx === idx ? null : idx)}
                onToggleTag={toggleMemberTag}
                restrictionDrafts={restrictionDrafts}
                onDraftChange={(idx, text) => setRestrictionDrafts((prev) => ({ ...prev, [idx]: text }))}
                onAddRestriction={addRestriction}
                onRemoveRestriction={removeRestriction}
                onViewNutrition={setNutritionMemberIdx}
              />
            ) : (
              <RecipesScreen diet={diet} onSetDiet={setDiet} onSelect={(r) => setActiveRecipeId(r.id)} />
            )}

            {assistantOpen && (
              <AssistantPanel
                onClose={() => { setAssistantOpen(false); setAssistantAnswer(null); }}
                answer={assistantAnswer}
                onAsk={setAssistantAnswer}
                onReset={() => setAssistantAnswer(null)}
              />
            )}

            {toast && (
              <div style={{ position: "absolute", left: 14, right: 14, bottom: 88, background: colors.ink, color: "#fff", borderRadius: 12, padding: "10px 14px", fontSize: 13, textAlign: "center", zIndex: 40, ...sans }}>
                {toast}
              </div>
            )}
          </div>

          {!overlay && (
            <button
              type="button"
              onClick={() => setAssistantOpen((o) => !o)}
              style={{
                position: "absolute", right: 16, bottom: 92, width: 50, height: 50, borderRadius: "50%",
                background: colors.primary, border: "none", boxShadow: "0 8px 18px rgba(193,68,14,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 25,
              }}
            >
              <MessageCircle size={22} color="#fff" />
            </button>
          )}

          {!overlay && (
            <div style={{ display: "flex", borderTop: `1px solid ${colors.border}`, background: colors.card, padding: "10px 8px 14px" }}>
              {navItems.map((n) => {
                const Icon = n.icon;
                const active = screen === n.key;
                return (
                  <button
                    type="button"
                    key={n.key}
                    onClick={() => setScreen(n.key)}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}
                  >
                    <div style={{ padding: "4px 14px", borderRadius: 999, background: active ? colors.primarySoft : "transparent" }}>
                      <Icon size={19} color={active ? colors.primary : colors.inkSoft} />
                    </div>
                    <span style={{ ...sans, fontSize: 10, fontWeight: 700, color: active ? colors.primary : colors.inkSoft }}>{n.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p style={{ ...sans, textAlign: "center", fontSize: 12, color: "#8A7563", marginTop: 14 }}>
          Stop wondering what to cook. KhaanaKyaHai helps your family decide.
        </p>
      </div>
    </div>
  );
}

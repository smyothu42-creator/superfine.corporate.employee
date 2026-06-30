import type { MenuItem, ProteinType } from "./types";

/**
 * The company's curated menu. Menus rotate by weekday (the User Flow notes the
 * "Menu may differ each day"), so items carry `availableDays`. Items with no
 * `availableDays` are always on the menu.
 *
 * Per the interviews, only items on the company contract appear here — no
 * "individual vs. family" detour, no off-contract items (clam chowder, etc.).
 */
export const menu: MenuItem[] = [
  {
    id: "bbq-brisket-bowl",
    name: "BBQ Brisket Bowl",
    category: "Mains",
    cuisine: "American",
    description: "Slow-smoked brisket, pickled slaw, chimichurri rice",
    proteinType: "Beef",
    allergens: "none",
    tags: ["Gluten-Free"],
    price: 16.5,
    type: "individual",
    popular: true,
    availableDays: [1, 3],
    image: "https://www.themealdb.com/images/media/meals/ursuup1487348423.jpg",
    ingredients:
      "Beef brisket, brown rice, red cabbage, carrot, parsley, cilantro, garlic, red wine vinegar, olive oil, smoked paprika, sea salt",
    nutrition: { calories: 640, protein: 38, carbs: 52, fat: 28 },
    addOns: [
      {
        id: "sauce",
        name: "Sauces",
        select: "multi",
        required: false,
        max: 2,
        options: [
          { id: "chimichurri", name: "Extra chimichurri", price: 0 },
          { id: "bbq", name: "House BBQ", price: 0 },
          { id: "hot", name: "Hot sauce", price: 0 },
        ],
      },
      {
        id: "extra-protein",
        name: "Add protein",
        select: "single",
        required: false,
        options: [
          { id: "none", name: "No extra", price: 0 },
          { id: "extra-brisket", name: "Extra brisket (+$4)", price: 4 },
        ],
      },
    ],
  },
  {
    id: "jackfruit-tacos",
    name: "Jackfruit Tacos",
    category: "Mains",
    cuisine: "Mexican",
    description: "Pulled jackfruit, salsa verde, corn tortillas",
    proteinType: "Plant-based",
    allergens: "none",
    tags: ["Vegan", "Gluten-Free"],
    price: 13.0,
    type: "individual",
    popular: true,
    image: "https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg",
    ingredients:
      "Young jackfruit, corn tortillas, tomatillo, jalapeño, onion, cilantro, lime, cumin, smoked paprika, olive oil",
    nutrition: { calories: 480, protein: 11, carbs: 72, fat: 16 },
    addOns: [
      {
        id: "salsa",
        name: "Salsa",
        select: "single",
        required: false,
        options: [
          { id: "verde", name: "Salsa verde (mild)", price: 0 },
          { id: "roja", name: "Salsa roja (hot)", price: 0 },
        ],
      },
    ],
  },
  {
    id: "chicken-shawarma",
    name: "Chicken Shawarma Wrap",
    category: "Mains",
    cuisine: "Middle Eastern",
    description: "Marinated chicken, garlic toum, flatbread",
    proteinType: "Chicken",
    allergens: "gluten, sesame",
    tags: ["Halal"],
    price: 15.0,
    type: "individual",
    availableDays: [2, 3],
    image: "https://www.themealdb.com/images/media/meals/kcv6hj1598733479.jpg",
    ingredients:
      "Chicken thigh, wheat flatbread, garlic toum, tahini, tomato, pickle, parsley, lemon, cumin, coriander",
    nutrition: { calories: 590, protein: 34, carbs: 48, fat: 27 },
    addOns: [
      {
        id: "spice",
        name: "Spice level",
        select: "single",
        required: true,
        options: [
          { id: "mild", name: "Mild", price: 0 },
          { id: "medium", name: "Medium", price: 0 },
          { id: "hot", name: "Hot", price: 0 },
        ],
      },
      {
        id: "sides",
        name: "Add a side",
        select: "multi",
        required: false,
        options: [
          { id: "fries", name: "Sumac fries (+$3)", price: 3 },
          { id: "hummus", name: "Hummus cup (+$2.5)", price: 2.5 },
        ],
      },
    ],
  },
  {
    id: "quinoa-salad",
    name: "Quinoa Harvest Salad",
    category: "Salads",
    cuisine: "Californian",
    description: "Roasted squash, kale, pomegranate, lemon-tahini",
    proteinType: "Plant-based",
    allergens: "sesame",
    tags: ["Vegan", "Gluten-Free"],
    price: 13.5,
    type: "individual",
    seasonal: true,
    image: "https://www.themealdb.com/images/media/meals/bqx8mc1782684286.jpg",
    ingredients:
      "Quinoa, butternut squash, kale, pomegranate seeds, pumpkin seeds, tahini, lemon, olive oil, maple, sea salt",
    nutrition: { calories: 420, protein: 12, carbs: 58, fat: 18 },
    addOns: [
      {
        id: "protein",
        name: "Add protein",
        select: "single",
        required: false,
        options: [
          { id: "none", name: "Keep it vegan", price: 0 },
          { id: "tofu", name: "Crispy tofu (+$3)", price: 3 },
          { id: "chicken", name: "Grilled chicken (+$4)", price: 4 },
        ],
      },
    ],
  },
  {
    id: "paneer-bowl",
    name: "Paneer Tikka Bowl",
    category: "Mains",
    cuisine: "Indian",
    description: "Tandoori paneer, turmeric rice, mint chutney",
    proteinType: "Vegetarian",
    allergens: "dairy",
    tags: ["Vegetarian", "Gluten-Free"],
    price: 14.5,
    type: "individual",
    popular: true,
    availableDays: [1, 2],
    image: "https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg",
    ingredients:
      "Paneer, basmati rice, turmeric, bell pepper, onion, yogurt marinade, mint, cilantro, lime, garam masala",
    nutrition: { calories: 560, protein: 24, carbs: 62, fat: 22 },
    addOns: [
      {
        id: "spice",
        name: "Spice level",
        select: "single",
        required: true,
        options: [
          { id: "mild", name: "Mild", price: 0 },
          { id: "medium", name: "Medium", price: 0 },
          { id: "hot", name: "Hot", price: 0 },
        ],
      },
    ],
  },
  {
    id: "bibimbap",
    name: "Veggie Bibimbap",
    category: "Mains",
    cuisine: "Korean",
    description: "Rice, seasoned vegetables, gochujang — choose a protein",
    proteinType: "Vegetarian",
    allergens: "soy, sesame",
    tags: ["Vegetarian"],
    price: 14.0,
    type: "individual",
    availableDays: [2, 3],
    image: "https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg",
    ingredients:
      "Rice, spinach, carrot, bean sprouts, shiitake, zucchini, gochujang, sesame oil, soy, choice of protein",
    nutrition: { calories: 600, protein: 22, carbs: 78, fat: 18 },
    addOns: [
      {
        id: "protein",
        name: "Choose a protein",
        select: "single",
        required: true,
        options: [
          { id: "tofu", name: "Crispy tofu", price: 0 },
          { id: "egg", name: "Fried egg", price: 0 },
          { id: "bulgogi", name: "Beef bulgogi (+$3)", price: 3 },
        ],
      },
    ],
  },
  {
    id: "mezze-box",
    name: "Mediterranean Mezze Box",
    category: "Salads",
    cuisine: "Mediterranean",
    description: "Falafel, hummus, tabbouleh, pita, olives",
    proteinType: "Plant-based",
    allergens: "gluten, sesame",
    tags: ["Vegan"],
    price: 13.0,
    type: "individual",
    image: "https://www.themealdb.com/images/media/meals/gpon5u1763801180.jpg",
    ingredients:
      "Falafel, hummus, tabbouleh, pita, kalamata olives, cucumber, tomato, tahini, lemon, parsley",
    nutrition: { calories: 520, protein: 16, carbs: 64, fat: 22 },
  },
  {
    id: "miso-soup",
    name: "Miso Soup & Edamame",
    category: "Sides",
    cuisine: "Japanese",
    description: "Warm miso broth with a side of sea-salt edamame",
    proteinType: "Plant-based",
    allergens: "soy",
    tags: ["Vegan", "Gluten-Free"],
    price: 5.5,
    type: "individual",
    image: "https://www.themealdb.com/images/media/meals/1529446352.jpg",
    ingredients: "White miso, tofu, wakame, scallion, edamame, sea salt",
    nutrition: { calories: 180, protein: 12, carbs: 16, fat: 7 },
  },
  {
    id: "fruit-cup",
    name: "Seasonal Fruit Cup",
    category: "Sides",
    cuisine: "Californian",
    description: "Chef's daily selection of fresh fruit",
    allergens: "none",
    tags: ["Vegan", "Gluten-Free", "Nut-Free"],
    price: 4.5,
    type: "individual",
    image: "https://www.themealdb.com/images/media/meals/gkcdpl1764441325.jpg",
    ingredients: "Seasonal fruit (melon, berries, citrus, grapes)",
    nutrition: { calories: 110, protein: 2, carbs: 27, fat: 0 },
  },
  {
    id: "teriyaki-salmon-bowl",
    name: "Teriyaki Salmon Bowl",
    category: "Mains",
    cuisine: "Japanese",
    description: "Glazed salmon, steamed rice, sesame greens, edamame",
    proteinType: "Seafood",
    allergens: "fish, soy, sesame",
    tags: ["Gluten-Free", "Dairy-Free"],
    price: 16.0,
    type: "individual",
    popular: true,
    image: "https://www.themealdb.com/images/media/meals/ikizdm1763760862.jpg",
    ingredients:
      "Salmon, jasmine rice, broccolini, edamame, scallion, sesame seeds, soy-teriyaki glaze, ginger, garlic",
    nutrition: { calories: 610, protein: 36, carbs: 58, fat: 24 },
  },
  {
    id: "margherita-flatbread",
    name: "Margherita Flatbread",
    category: "Mains",
    cuisine: "Italian",
    description: "Stone-baked flatbread, San Marzano tomato, fresh mozzarella, basil",
    proteinType: "Vegetarian",
    allergens: "gluten, dairy",
    tags: ["Vegetarian"],
    price: 12.5,
    type: "individual",
    availableDays: [1, 2, 3],
    image: "https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg",
    ingredients: "Flatbread, San Marzano tomato, fresh mozzarella, basil, olive oil, sea salt",
    nutrition: { calories: 540, protein: 21, carbs: 62, fat: 22 },
  },
  {
    id: "cobb-salad",
    name: "Chicken Cobb Salad",
    category: "Salads",
    cuisine: "American",
    description: "Grilled chicken, egg, avocado, bacon, blue cheese, ranch",
    proteinType: "Chicken",
    allergens: "egg, dairy",
    tags: ["Gluten-Free", "Nut-Free"],
    price: 14.0,
    type: "individual",
    image: "https://www.themealdb.com/images/media/meals/ypuxtw1511297463.jpg",
    ingredients:
      "Romaine, grilled chicken, hard-boiled egg, avocado, bacon, cherry tomato, blue cheese, ranch dressing",
    nutrition: { calories: 520, protein: 38, carbs: 14, fat: 34 },
  },
  {
    id: "pad-thai",
    name: "Veggie Pad Thai",
    category: "Mains",
    cuisine: "Thai",
    description: "Rice noodles, tofu, bean sprouts, peanuts, tamarind sauce",
    proteinType: "Vegetarian",
    allergens: "peanuts, soy",
    tags: ["Vegetarian", "Dairy-Free"],
    price: 13.5,
    type: "individual",
    popular: true,
    availableDays: [2, 3],
    image: "https://www.themealdb.com/images/media/meals/rg9ze01763479093.jpg",
    ingredients:
      "Rice noodles, tofu, bean sprouts, carrot, scallion, egg, crushed peanuts, tamarind, lime, chili",
    nutrition: { calories: 560, protein: 18, carbs: 76, fat: 20 },
    addOns: [
      {
        id: "protein",
        name: "Add protein",
        select: "single",
        required: false,
        options: [
          { id: "none", name: "Keep it veggie", price: 0 },
          { id: "shrimp", name: "Shrimp (+$4)", price: 4 },
          { id: "chicken", name: "Grilled chicken (+$3)", price: 3 },
        ],
      },
    ],
  },
  {
    id: "buddha-bowl",
    name: "Green Buddha Bowl",
    category: "Salads",
    cuisine: "Californian",
    description: "Brown rice, roasted chickpeas, avocado, greens, tahini drizzle",
    proteinType: "Plant-based",
    allergens: "sesame",
    tags: ["Vegan", "Gluten-Free", "Dairy-Free"],
    price: 13.0,
    type: "individual",
    seasonal: true,
    image: "https://www.themealdb.com/images/media/meals/uttupv1511815050.jpg",
    ingredients:
      "Brown rice, roasted chickpeas, avocado, kale, red cabbage, carrot, cucumber, tahini, lemon, olive oil",
    nutrition: { calories: 490, protein: 16, carbs: 64, fat: 20 },
  },
  {
    id: "beef-pho",
    name: "Beef Pho",
    category: "Mains",
    cuisine: "Vietnamese",
    description: "Slow-simmered broth, rice noodles, brisket, herbs, lime",
    proteinType: "Beef",
    allergens: "soy",
    tags: ["Dairy-Free"],
    price: 14.5,
    type: "individual",
    availableDays: [1, 3],
    image: "https://www.themealdb.com/images/media/meals/pbzcrx1763765096.jpg",
    ingredients:
      "Beef broth, rice noodles, brisket, bean sprouts, Thai basil, cilantro, scallion, lime, star anise, ginger",
    nutrition: { calories: 520, protein: 30, carbs: 64, fat: 14 },
  },
  {
    id: "caprese-sandwich",
    name: "Caprese Sandwich",
    category: "Mains",
    cuisine: "Italian",
    description: "Ciabatta, fresh mozzarella, tomato, basil pesto, balsamic",
    proteinType: "Vegetarian",
    allergens: "gluten, dairy, nuts",
    tags: ["Vegetarian"],
    price: 11.5,
    type: "individual",
    image: "https://www.themealdb.com/images/media/meals/wvqpwt1468339226.jpg",
    ingredients: "Ciabatta, fresh mozzarella, tomato, basil pesto, arugula, balsamic glaze, olive oil",
    nutrition: { calories: 580, protein: 22, carbs: 60, fat: 28 },
  },
  {
    id: "greek-yogurt-parfait",
    name: "Greek Yogurt Parfait",
    category: "Sides",
    cuisine: "Mediterranean",
    description: "Greek yogurt, granola, honey, seasonal berries",
    proteinType: "Vegetarian",
    allergens: "dairy, nuts",
    tags: ["Vegetarian"],
    price: 6.0,
    type: "individual",
    image: "https://www.themealdb.com/images/media/meals/wuxrtu1483564410.jpg",
    ingredients: "Greek yogurt, oat granola, honey, blueberries, strawberries, almonds",
    nutrition: { calories: 320, protein: 16, carbs: 42, fat: 10 },
  },
  {
    id: "bbq-family-style",
    name: "BBQ Family Style",
    category: "Family Style",
    cuisine: "American",
    description: "Choose your entrées — sides + sauces included. Serves the team.",
    proteinType: "Beef",
    allergens: "none",
    tags: ["Gluten-Free"],
    price: 185.0,
    type: "family_style",
    serves: 10,
    image: "https://www.themealdb.com/images/media/meals/atd5sh1583188467.jpg",
    ingredients:
      "Choice of brisket / pulled pork / jackfruit, cornbread, mac & cheese, slaw, pickles, house BBQ + chimichurri sauces",
    nutrition: { calories: 720, protein: 41, carbs: 60, fat: 32 },
    addOns: [
      {
        id: "entrees",
        name: "Choose 2 entrées",
        select: "multi",
        required: true,
        max: 2,
        options: [
          { id: "brisket", name: "Smoked brisket", price: 0 },
          { id: "pork", name: "Pulled pork", price: 0 },
          { id: "jackfruit", name: "BBQ jackfruit (vegan)", price: 0 },
        ],
      },
      {
        id: "portion",
        name: "Portion size",
        select: "single",
        required: true,
        options: [
          { id: "standard", name: "Standard (serves 10)", price: 0 },
          { id: "expanded", name: "Expanded (serves 14) (+$60)", price: 60 },
        ],
      },
    ],
  },
];

export const menuCategories = ["Mains", "Salads", "Sides", "Family Style"];

export const dietaryFilters = [
  "Vegan",
  "Vegetarian",
  "Halal",
  "Gluten-Free",
  "Nut-Free",
  "Dairy-Free",
] as const;

export const cuisines = Array.from(new Set(menu.map((m) => m.cuisine))).sort();

/** Protein types present on the menu, in a stable display order for the filter. */
const PROTEIN_ORDER: ProteinType[] = ["Chicken", "Beef", "Seafood", "Vegetarian", "Plant-based"];
export const proteinTypes = PROTEIN_ORDER.filter((p) => menu.some((m) => m.proteinType === p));

export function getItem(id: string) {
  return menu.find((m) => m.id === id);
}

/** Items available on a given weekday (1=Mon … 7=Sun). */
export function menuForWeekday(weekday: number) {
  return menu.filter(
    (m) => !m.availableDays || m.availableDays.length === 0 || m.availableDays.includes(weekday),
  );
}

/** Does an item have any required add-on group? (User Flow's mandatory branch) */
export function hasRequiredAddOns(item: MenuItem) {
  return (item.addOns ?? []).some((g) => g.required);
}

/** Does an item have any optional add-on group? ("Customize") */
export function hasOptionalAddOns(item: MenuItem) {
  return (item.addOns ?? []).some((g) => !g.required);
}

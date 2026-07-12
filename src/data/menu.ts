import type {
  MenuItem,
  MenuCombo,
  AddOnGroup,
  OrderType,
  ProteinType,
  ServingGroup,
  ServingOption,
} from "./types";

/**
 * The option groups an individual meal is built from, straight out of the admin
 * SKU setup: Protein, Sauce, Side — nothing else. Combos are the cross-product
 * of these three, so every individual plate offers the same shape of choice.
 *
 * Shared by reference across items; nothing mutates a group.
 */
export const INDIVIDUAL_OPTION_GROUPS: AddOnGroup[] = [
  {
    id: "protein",
    name: "Protein",
    select: "single",
    required: true,
    options: [
      { id: "chicken", name: "Chicken", price: 2 },
      { id: "beef", name: "Beef", price: 3 },
      { id: "tofu", name: "Tofu", price: 1.5 },
    ],
  },
  {
    id: "sauce",
    name: "Sauce",
    select: "single",
    required: true,
    options: [
      { id: "ranch", name: "Ranch", price: 0.5 },
      { id: "italian", name: "Italian", price: 0.5 },
      { id: "caesar", name: "Caesar Dressing", price: 0 },
    ],
  },
  {
    id: "side",
    name: "Side",
    select: "single",
    required: false,
    options: [
      { id: "garlic-bread", name: "Garlic Bread", price: 1.5 },
      { id: "rice", name: "Rice", price: 1 },
      { id: "napkins", name: "Extra Napkins", price: 0 },
    ],
  },
];

/**
 * The Protein and Sauce a family-style package is split across. Both are packed
 * in their own trays, so each is an independent group: nothing pairs a protein
 * with a sauce.
 */
const FAMILY_PROTEIN_CHOICES: ServingOption[] = [
  { id: "chicken", name: "Chicken", upchargePerServing: 2 },
  { id: "paneer", name: "Paneer", upchargePerServing: 2.5 },
  { id: "tofu", name: "Tofu", upchargePerServing: 1.5 },
];

const FAMILY_SAUCE_CHOICES: ServingOption[] = [
  { id: "ranch", name: "Ranch", upchargePerServing: 0.5 },
  { id: "bbq", name: "BBQ", upchargePerServing: 0.5 },
  { id: "honey-mustard", name: "Honey Mustard", upchargePerServing: 0.5 },
];

/**
 * Every family package asks the same two questions, and each answer must total
 * the quantity on its own — 6 covers owes 6 proteins and 6 sauces, in any mix.
 */
const SEPARATE_PACKING_GROUPS: ServingGroup[] = [
  {
    id: "protein",
    name: "Protein",
    helper: "Packed separately. One per person.",
    perGuest: 1,
    options: FAMILY_PROTEIN_CHOICES,
  },
  {
    id: "sauce",
    name: "Sauce",
    helper: "Packed separately. One per person.",
    perGuest: 1,
    options: FAMILY_SAUCE_CHOICES,
  },
];


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
    counterpartId: "bbq-family-style",
    popular: true,
    availableDays: [1, 3],
    image: "https://www.themealdb.com/images/media/meals/ursuup1487348423.jpg",
    ingredients:
      "Beef brisket, brown rice, red cabbage, carrot, parsley, cilantro, garlic, red wine vinegar, olive oil, smoked paprika, sea salt",
    nutrition: { calories: 640, protein: 38, carbs: 52, fat: 28 },
    addOns: INDIVIDUAL_OPTION_GROUPS,
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
    counterpartId: "taco-fiesta-bar",
    popular: true,
    image: "https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg",
    ingredients:
      "Young jackfruit, corn tortillas, tomatillo, jalapeño, onion, cilantro, lime, cumin, smoked paprika, olive oil",
    nutrition: { calories: 480, protein: 11, carbs: 72, fat: 16 },
    addOns: INDIVIDUAL_OPTION_GROUPS,
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
    price: 5.0,
    originalPrice: 15.0,
    type: "individual",
    availableDays: [2, 3],
    image: "https://www.themealdb.com/images/media/meals/kcv6hj1598733479.jpg",
    ingredients:
      "Chicken thigh, wheat flatbread, garlic toum, tahini, tomato, pickle, parsley, lemon, cumin, coriander",
    nutrition: { calories: 590, protein: 34, carbs: 48, fat: 27 },
    addOns: INDIVIDUAL_OPTION_GROUPS,
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
    addOns: INDIVIDUAL_OPTION_GROUPS,
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
    addOns: INDIVIDUAL_OPTION_GROUPS,
  },
  {
    id: "bibimbap",
    name: "Veggie Bibimbap",
    category: "Mains",
    cuisine: "Korean",
    description: "Rice, seasoned vegetables, gochujang. Choose a protein",
    proteinType: "Vegetarian",
    allergens: "soy, sesame",
    tags: ["Vegetarian"],
    price: 9.5,
    originalPrice: 14.0,
    type: "individual",
    availableDays: [2, 3],
    image: "https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg",
    ingredients:
      "Rice, spinach, carrot, bean sprouts, shiitake, zucchini, gochujang, sesame oil, soy, choice of protein",
    nutrition: { calories: 600, protein: 22, carbs: 78, fat: 18 },
    addOns: INDIVIDUAL_OPTION_GROUPS,
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
    counterpartId: "mezze-feast",
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
    description:
      "Stone-baked flatbread, San Marzano tomato, fresh mozzarella, basil",
    proteinType: "Vegetarian",
    allergens: "gluten, dairy",
    tags: ["Vegetarian"],
    price: 8.5,
    originalPrice: 12.5,
    type: "individual",
    availableDays: [1, 2, 3],
    image: "https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg",
    ingredients:
      "Flatbread, San Marzano tomato, fresh mozzarella, basil, olive oil, sea salt",
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
    addOns: INDIVIDUAL_OPTION_GROUPS,
  },
  {
    id: "buddha-bowl",
    name: "Green Buddha Bowl",
    category: "Salads",
    cuisine: "Californian",
    description:
      "Brown rice, roasted chickpeas, avocado, greens, tahini drizzle",
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
    ingredients:
      "Ciabatta, fresh mozzarella, tomato, basil pesto, arugula, balsamic glaze, olive oil",
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
    ingredients:
      "Greek yogurt, oat granola, honey, blueberries, strawberries, almonds",
    nutrition: { calories: 320, protein: 16, carbs: 42, fat: 10 },
  },
  /* ── Family Style packages ────────────────────────────────────────────────
   * Priced per guest, not per plate. Each `servingGroups` entry asks the user to
   * distribute `guests × perGuest` servings across its options.
   */
  {
    id: "bbq-family-style",
    name: "BBQ Feast",
    category: "Family Style",
    cuisine: "American",
    description: "Smoked meats by the tray. Sides and sauces come with it.",
    proteinType: "Beef",
    allergens: "none",
    tags: ["Gluten-Free"],
    price: 185.0,
    pricePerGuest: 18.5,
    minGuests: 10,
    counterpartId: "bbq-brisket-bowl",
    type: "family_style",
    serves: 10,
    image: "https://www.themealdb.com/images/media/meals/atd5sh1583188467.jpg",
    ingredients:
      "Choice of brisket / pulled pork / jackfruit, cornbread, mac & cheese, slaw, pickles, house BBQ + chimichurri sauces",
    nutrition: { calories: 720, protein: 41, carbs: 60, fat: 32 },
    includedItems: [
      { name: "Skillet cornbread", note: "1 per guest" },
      { name: "Baked mac & cheese", note: "Shared trays" },
      { name: "Pickled slaw & house pickles", note: "Shared bowls" },
      { name: "House BBQ + chimichurri", note: "Sauce station" },
      { name: "Plates, cutlery & serving spoons", note: "Included" },
    ],
    servingGroups: SEPARATE_PACKING_GROUPS,
  },
  {
    id: "mezze-feast",
    name: "Mediterranean Mezze Feast",
    category: "Family Style",
    cuisine: "Mediterranean",
    description:
      "A mezze spread for the table. Choose the mains, the dips come as standard.",
    proteinType: "Chicken",
    allergens: "gluten, sesame, dairy",
    tags: ["Vegetarian"],
    price: 140.0,
    pricePerGuest: 17.5,
    minGuests: 8,
    counterpartId: "mezze-box",
    type: "family_style",
    serves: 8,
    image: "https://www.themealdb.com/images/media/meals/u5e9qq1763795441.jpg",
    ingredients:
      "Hummus, baba ganoush, falafel, chicken shawarma, tabbouleh, fattoush, warm pita, tzatziki, tahini",
    nutrition: { calories: 640, protein: 34, carbs: 58, fat: 28 },
    includedItems: [
      { name: "Hummus & baba ganoush", note: "Shared bowls" },
      { name: "Tabbouleh & fattoush", note: "Shared bowls" },
      { name: "Warm pita", note: "2 per guest" },
      { name: "Tzatziki, tahini & harissa", note: "Sauce station" },
    ],
    servingGroups: SEPARATE_PACKING_GROUPS,
  },
  {
    id: "taco-fiesta-bar",
    name: "Taco Fiesta Bar",
    category: "Family Style",
    cuisine: "Mexican",
    description:
      "Build-your-own taco bar. Choose the fillings; salsas, guac and fixings are included.",
    proteinType: "Beef",
    allergens: "dairy",
    tags: ["Gluten-Free"],
    price: 165.0,
    pricePerGuest: 16.5,
    minGuests: 10,
    counterpartId: "jackfruit-tacos",
    type: "family_style",
    serves: 12,
    image: "https://www.themealdb.com/images/media/meals/ypxvwv1505333929.jpg",
    ingredients:
      "Carne asada, chicken tinga, pinto-bean picadillo, corn & flour tortillas, salsa roja & verde, guacamole, cotija, lime crema",
    nutrition: { calories: 680, protein: 38, carbs: 62, fat: 30 },
    includedItems: [
      { name: "Corn & flour tortillas", note: "3 per guest" },
      { name: "Salsa roja & salsa verde", note: "Sauce station" },
      { name: "Guacamole, cotija & lime crema", note: "Shared bowls" },
      { name: "Cilantro, onion & lime", note: "Garnish tray" },
    ],
    servingGroups: SEPARATE_PACKING_GROUPS,
  },
  {
    id: "pan-asian-banquet",
    name: "Pan-Asian Banquet",
    category: "Family Style",
    cuisine: "Asian",
    description:
      "Stir-fries, dumplings and noodles by the platter. Choose your mix.",
    proteinType: "Plant-based",
    allergens: "soy, sesame, gluten",
    tags: ["Vegetarian"],
    price: 175.0,
    pricePerGuest: 17.5,
    minGuests: 10,
    type: "family_style",
    serves: 10,
    image: "https://www.themealdb.com/images/media/meals/zry07j1763779321.jpg",
    ingredients:
      "Veg & chicken stir-fries, pork + veggie dumplings, egg fried rice, garlic noodles, bok choy, dipping sauces",
    nutrition: { calories: 700, protein: 33, carbs: 72, fat: 26 },
    includedItems: [
      { name: "Egg fried rice", note: "Shared platters" },
      { name: "Garlic noodles", note: "Shared platters" },
      { name: "Charred bok choy", note: "Shared platters" },
      { name: "Soy, chili crisp & ponzu", note: "Sauce station" },
    ],
    servingGroups: SEPARATE_PACKING_GROUPS,
  },
  {
    id: "cookie-brownie-platter",
    name: "Cookie & Brownie Platter",
    category: "Family Style",
    cuisine: "American",
    description:
      "A shared sweet platter. Nothing to choose. It arrives ready to serve.",
    proteinType: "Vegetarian",
    allergens: "gluten, dairy, egg, nuts",
    tags: ["Vegetarian"],
    price: 48.0,
    pricePerGuest: 4.0,
    minGuests: 12,
    type: "family_style",
    serves: 12,
    image: "https://www.themealdb.com/images/media/meals/drsxrq1585564980.jpg",
    ingredients:
      "Brown-butter chocolate chip cookies, fudge brownies, sea salt, walnuts",
    nutrition: { calories: 380, protein: 5, carbs: 48, fat: 19 },
    includedItems: [
      { name: "Brown-butter chocolate chip cookies", note: "1 per guest" },
      { name: "Fudge brownies", note: "1 per guest" },
      { name: "Napkins & serving tongs", note: "Included" },
    ],
  },
  {
    id: "iced-matcha-latte",
    name: "Iced Matcha Latte",
    category: "Beverages",
    cuisine: "Cafe",
    description:
      "Ceremonial matcha over oat milk, lightly sweetened. Served over ice.",
    proteinType: "Plant-based",
    allergens: "none",
    tags: ["Vegan", "Vegetarian", "Gluten-Free"],
    price: 5.5,
    type: "individual",
    image:
      "https://www.thecocktaildb.com/images/media/drink/metwgh1606770327.jpg",
    ingredients: "Ceremonial-grade matcha, oat milk, agave, ice",
    nutrition: { calories: 120, protein: 2, carbs: 18, fat: 4 },
  },
  {
    id: "cold-brew-coffee",
    name: "Cold Brew Coffee",
    category: "Beverages",
    cuisine: "Cafe",
    description:
      "Slow-steeped 18 hours for a smooth, low-acid brew. Black, over ice.",
    proteinType: "Plant-based",
    allergens: "none",
    tags: ["Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free"],
    price: 4.5,
    type: "individual",
    image:
      "https://www.thecocktaildb.com/images/media/drink/ytprxy1454513855.jpg",
    ingredients: "Cold-brewed arabica coffee, ice",
    nutrition: { calories: 5, protein: 0, carbs: 0, fat: 0 },
  },
  {
    id: "sparkling-lemonade",
    name: "Sparkling Lemonade",
    category: "Beverages",
    cuisine: "Cafe",
    description:
      "Fresh-squeezed lemon, a touch of cane sugar, topped with sparkling water.",
    proteinType: "Plant-based",
    allergens: "none",
    tags: ["Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free"],
    price: 4.0,
    type: "individual",
    image:
      "https://www.thecocktaildb.com/images/media/drink/b3n0ge1503565473.jpg",
    ingredients: "Fresh lemon juice, cane sugar, sparkling water, mint",
    nutrition: { calories: 110, protein: 0, carbs: 27, fat: 0 },
  },
];

/**
 * Menu fetch for an order. Both parameters are mandatory — the backend keys the
 * menu off (menu type × delivery date), so individual and family-style menus,
 * pricing and availability are returned separately.
 *
 * @param type    "individual" | "family_style"
 * @param weekday 1 = Mon … 7 = Sun (the delivery date's weekday)
 */
export function menuFor(type: OrderType, weekday: number) {
  return menu.filter(
    (m) =>
      m.type === type &&
      (!m.availableDays ||
        m.availableDays.length === 0 ||
        m.availableDays.includes(weekday)),
  );
}

/**
 * Whether a specific menu item is served on a given weekday (1 = Mon … 7 = Sun).
 * Menus rotate by weekday, so an item added for one delivery day may not exist
 * on another. Items with no `availableDays` are always served. Unknown ids are
 * treated as unavailable.
 */
export function isItemAvailableOn(itemId: string, weekday: number): boolean {
  const item = getItem(itemId);
  if (!item) return false;
  return (
    !item.availableDays ||
    item.availableDays.length === 0 ||
    item.availableDays.includes(weekday)
  );
}

/**
 * Customer-facing menu categories — the sections *within* a menu, shown as
 * filter tags under the menu header. The Individual and Family Style menus have
 * their own sections and never share one: `categoriesForType` returns only the
 * sections that have items for that menu, so a category tag row always belongs
 * to exactly one menu.
 */
export const menuCategories = [
  // Individual menu sections.
  "Craft Your Plate",
  "The Weekly Drop",
  "Sizzlin' Summer",
  "SFK Staples",
  "Leaves & Grains",
  "Stack, Wrap & Roll",
  "Savvy Servings",
  "Add Ons",
  "Beverages",
  // Family Style menu sections.
  "Feasts",
  "Build-Your-Own Bars",
  "Shared Platters",
] as const;

export type MenuCategory = (typeof menuCategories)[number];

/** Which branded section each menu item belongs to. */
const CATEGORY_BY_ID: Record<string, MenuCategory> = {
  // Craft Your Plate — build-your-own bowls
  "bbq-brisket-bowl": "Craft Your Plate",
  "paneer-bowl": "Craft Your Plate",
  bibimbap: "Craft Your Plate",
  "buddha-bowl": "Craft Your Plate",
  // The Weekly Drop — rotating features
  "teriyaki-salmon-bowl": "The Weekly Drop",
  "margherita-flatbread": "The Weekly Drop",
  // Sizzlin' Summer — seasonal
  "quinoa-salad": "Sizzlin' Summer",
  "fruit-cup": "Sizzlin' Summer",
  // SFK Staples — signature mains
  "beef-pho": "SFK Staples",
  "pad-thai": "SFK Staples",
  // Leaves & Grains — salads & grain bowls
  "cobb-salad": "Leaves & Grains",
  "mezze-box": "Leaves & Grains",
  // Stack, Wrap & Roll — sandwiches, wraps, tacos, flatbreads
  "chicken-shawarma": "Stack, Wrap & Roll",
  "jackfruit-tacos": "Stack, Wrap & Roll",
  "caprese-sandwich": "Stack, Wrap & Roll",
  // Savvy Servings — light bites
  "miso-soup": "Savvy Servings",
  // Add Ons — snacks & extras
  "greek-yogurt-parfait": "Add Ons",
  // Beverages
  "iced-matcha-latte": "Beverages",
  "cold-brew-coffee": "Beverages",
  "sparkling-lemonade": "Beverages",

  // ── Family Style menu sections ──
  // Feasts — a set spread, you choose the mains
  "bbq-family-style": "Feasts",
  "mezze-feast": "Feasts",
  "pan-asian-banquet": "Feasts",
  // Build-Your-Own Bars — the team assembles their own
  "taco-fiesta-bar": "Build-Your-Own Bars",
  // Shared Platters — set platters, nothing to configure
  "cookie-brownie-platter": "Shared Platters",
};

/** The section of the menu an item sits in (falls back per menu type). */
export function menuCategory(item: MenuItem): MenuCategory {
  return (
    CATEGORY_BY_ID[item.id] ??
    (item.type === "family_style" ? "Feasts" : "SFK Staples")
  );
}

/**
 * Branded categories that have at least one item for a menu type (across all
 * days) — used for the category tag row so every relevant tag is shown, even if
 * a given day's rotation doesn't include it.
 */
export function categoriesForType(type: OrderType): MenuCategory[] {
  return menuCategories.filter((c) =>
    menu.some((m) => m.type === type && menuCategory(m) === c),
  );
}

export const dietaryFilters = [
  "Vegan",
  "Vegetarian",
  "Halal",
  "Gluten-Free",
  "Nut-Free",
  "Dairy-Free",
] as const;

/**
 * Allergens shown in the "Allergens to avoid" multiselect (menu filter + the
 * profile). Separate from dietary preferences — the two are distinct concerns.
 */
export const allergenOptions = [
  "Peanuts",
  "Tree Nuts",
  "Dairy",
  "Eggs",
  "Shellfish",
  "Soy",
  "Wheat",
  "Gluten",
  "Fish",
  "Sesame",
] as const;

/**
 * Dietary preferences shown in the "Dietary" multiselect (menu filter + the
 * profile). Selecting these *shows only* matching items (vs. allergens, which
 * *hide* matching items).
 */
export const dietaryPreferences = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Low-Calorie",
  "Halal",
  "Kosher",
] as const;

/** Tokens that signal each filter allergen's presence on an item. */
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  Peanuts: ["peanuts", "peanut"],
  "Tree Nuts": [
    "nuts",
    "tree nuts",
    "almonds",
    "cashews",
    "walnuts",
    "pecans",
    "hazelnuts",
    "pistachios",
  ],
  Dairy: ["dairy", "milk", "cheese", "butter", "cream", "yogurt"],
  Eggs: ["egg", "eggs"],
  Shellfish: [
    "shellfish",
    "shrimp",
    "prawns",
    "crab",
    "lobster",
    "clams",
    "mussels",
    "oysters",
    "scallops",
  ],
  Soy: ["soy", "soya", "tofu", "edamame", "miso"],
  Wheat: ["wheat", "gluten"],
  Gluten: ["gluten", "wheat", "barley", "rye"],
  Fish: ["fish", "salmon", "tuna", "cod", "anchovy"],
  Sesame: ["sesame", "tahini"],
};

/** The allergen tokens declared on an item, e.g. "gluten, sesame" → {gluten, sesame}. */
function itemAllergenTokens(item: MenuItem) {
  return new Set(
    item.allergens
      .toLowerCase()
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "none"),
  );
}

/** True when the item contains ANY of the selected allergens (drives the avoid filter). */
export function itemHasAnyAllergen(item: MenuItem, selected: string[]) {
  if (!selected.length) return false;
  const tokens = itemAllergenTokens(item);
  return selected.some((label) => {
    const keywords = ALLERGEN_KEYWORDS[label] ?? [label.toLowerCase()];
    return keywords.some((kw) => tokens.has(kw));
  });
}

export const cuisines = Array.from(new Set(menu.map((m) => m.cuisine))).sort();

/** Protein types present on the menu, in a stable display order for the filter. */
const PROTEIN_ORDER: ProteinType[] = [
  "Chicken",
  "Beef",
  "Seafood",
  "Vegetarian",
  "Plant-based",
];
export const proteinTypes = PROTEIN_ORDER.filter((p) =>
  menu.some((m) => m.proteinType === p),
);

export function getItem(id: string) {
  return menu.find((m) => m.id === id);
}

/** Strip a trailing price parenthetical like " (+$3)" from an option name. */
export function cleanOptionName(name: string) {
  return name.replace(/\s*\(\+\$[\d.]+\)\s*$/, "").trim();
}

/** A "no add-on" style option (e.g. "No extra", "Keep it vegan") — omitted from combo labels. */
function isNoneOption(name: string, price: number) {
  return price === 0 && /^(no\b|none\b|keep it)/i.test(name);
}

/** Add-on group id/name looks like an extra side or a beverage. */
export function isSideOrBeverageGroup(g: AddOnGroup): boolean {
  return /\b(side|beverage|drink|soda|water)\b/i.test(`${g.id} ${g.name}`);
}

/**
 * Short, human summary of a set of chosen add-ons — "Mild · Extra brisket".
 * Drops "no add-on" defaults, mirroring the combo labels. Returns "" if there's
 * nothing meaningful to show.
 */
export function summarizeAddOns(
  addOns: { name: string; price: number }[],
): string {
  return addOns
    .filter((a) => !isNoneOption(a.name, a.price))
    .map((a) => cleanOptionName(a.name))
    .join(" · ");
}

/**
 * Build the pre-bundled combos for an item — the cartesian product of one
 * option per add-on group. The picker shows these as a single choice so the
 * user selects a whole combo rather than resolving each group on its own.
 * Returns [] for items with no add-ons. `omitGroup` drops matching groups
 * before bundling (e.g. Auto-Order setup hides side/beverage add-ons — those
 * are added later at review, not baked into the rotation).
 */
export function buildCombos(
  item: MenuItem,
  omitGroup?: (g: AddOnGroup) => boolean,
): MenuCombo[] {
  const groups = (item.addOns ?? []).filter((g) => !omitGroup?.(g));
  if (groups.length === 0) return [];

  let combos: MenuCombo[] = [
    { id: "", name: "", includes: [], selections: [], upcharge: 0 },
  ];
  for (const g of groups) {
    const next: MenuCombo[] = [];
    for (const base of combos) {
      for (const opt of g.options) {
        next.push({
          id: base.id ? `${base.id}|${g.id}:${opt.id}` : `${g.id}:${opt.id}`,
          name: "",
          includes: [],
          selections: [
            ...base.selections,
            {
              groupId: g.id,
              groupName: g.name,
              optionId: opt.id,
              name: opt.name,
              price: opt.price,
            },
          ],
          upcharge: base.upcharge + opt.price,
        });
      }
    }
    combos = next;
  }

  return combos.map((c) => {
    // Friendly label from the parts that actually add something.
    const parts = c.selections
      .filter((s) => !isNoneOption(s.name, s.price))
      .map((s) => cleanOptionName(s.name));
    // Full per-group breakdown so the user sees protein / sauce / side at a glance.
    const includes = c.selections.map((s) => ({
      group: s.groupName,
      item: cleanOptionName(s.name),
    }));
    return {
      ...c,
      name: parts.length ? parts.join(" · ") : "Classic",
      includes,
    };
  });
}

/** Meaningful add-on labels for a combo — the array form of its summary,
 *  matching the strings stored on an order line item's `addOns`. */
export function comboAddOnLabels(combo: MenuCombo): string[] {
  return combo.selections
    .filter((s) => !isNoneOption(s.name, s.price))
    .map((s) => cleanOptionName(s.name));
}

/** Does an item have any required add-on group? (User Flow's mandatory branch) */
export function hasRequiredAddOns(item: MenuItem) {
  return (item.addOns ?? []).some((g) => g.required);
}

/** Does an item have any optional add-on group? ("Customize") */
export function hasOptionalAddOns(item: MenuItem) {
  return (item.addOns ?? []).some((g) => !g.required);
}

/* ── Family Style ────────────────────────────────────────────────────────── */

export function isFamilyStyle(item: MenuItem) {
  return item.type === "family_style";
}

/** The smallest headcount this package will be cooked for. */
export function minGuestsFor(item: MenuItem) {
  return item.minGuests ?? item.serves ?? 1;
}

/** One guest's share of the package, before per-serving up-charges. */
export function pricePerGuestFor(item: MenuItem) {
  return item.pricePerGuest ?? item.price / minGuestsFor(item);
}

/** Groups the user must balance (vs. optional extras, which have perGuest 0). */
export function requiredServingGroups(item: MenuItem) {
  return (item.servingGroups ?? []).filter((g) => g.perGuest > 0);
}

/** How many servings a group needs at this headcount, e.g. 3 tacos × 20 guests. */
export function servingsRequired(group: ServingGroup, guests: number) {
  return group.perGuest * guests;
}

/** "serving" / "servings", or the group's own unit word ("taco", "tray"). */
export function servingUnit(group: ServingGroup, count: number) {
  const unit = group.unit ?? "serving";
  return count === 1 ? unit : `${unit}s`;
}

/**
 * The same dish on the other menu — the Individual plate for a Family Style
 * package, or vice versa. Both are real, separate menu entries; this just links
 * them so each can point at the other.
 */
export function counterpart(item: MenuItem): MenuItem | undefined {
  return item.counterpartId ? getItem(item.counterpartId) : undefined;
}

/**
 * What a family-style package costs: every guest's share, plus any per-serving
 * up-charges on the options they were assigned to (a premium protein, an extra
 * tray). Optional-extra groups (`perGuest: 0`) are pure add-on cost.
 *
 * A combined pairing already carries the sum of its Protein and Sauce
 * up-charges, so both packings price through the same loop.
 */
export function familyStyleTotal(
  item: MenuItem,
  guests: number,
  quantities: Record<string, Record<string, number>>,
): number {
  let total = pricePerGuestFor(item) * guests;
  for (const group of item.servingGroups ?? []) {
    for (const option of group.options) {
      const qty = quantities[group.id]?.[option.id] ?? 0;
      total += qty * option.upchargePerServing;
    }
  }
  return Math.round(total * 100) / 100;
}

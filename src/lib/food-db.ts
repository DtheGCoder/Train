// Große, kategorisierte Lebensmittel-Datenbank mit realistischen Nährwerten –
// inkl. Fast Food (McDonald's, Burger King, KFC, Subway …), Restaurant-/Imbiss-
// Gerichten und Fertigprodukten. Werte sind gerundete Richtwerte je Bezugsmenge.

import type { Macros } from "./coach-nutrition";

export type FoodTag = "protein" | "carb" | "fat" | "veg" | "fruit" | "snack";
export type FoodCategory =
  | "Protein"
  | "Milchprodukte"
  | "Kohlenhydrate"
  | "Backwaren"
  | "Obst"
  | "Gemüse"
  | "Hülsenfrüchte"
  | "Nüsse & Fette"
  | "Snacks & Süßes"
  | "Getränke"
  | "Fertiggericht"
  | "Fast Food"
  | "Saucen";

export type Food = {
  id: string;
  name: string;
  category: FoodCategory;
  unit: "g" | "Stück" | "Portion";
  base: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: FoodTag[];
};

export const FOOD_CATEGORIES: FoodCategory[] = [
  "Protein",
  "Milchprodukte",
  "Kohlenhydrate",
  "Backwaren",
  "Obst",
  "Gemüse",
  "Hülsenfrüchte",
  "Nüsse & Fette",
  "Snacks & Süßes",
  "Getränke",
  "Fertiggericht",
  "Fast Food",
  "Saucen",
];

const F = (
  id: string,
  name: string,
  category: FoodCategory,
  unit: Food["unit"],
  base: number,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  tags: FoodTag[] = [],
): Food => ({ id, name, category, unit, base, kcal, protein, carbs, fat, tags });

export const FOODS: Food[] = [
  // ---------------- Protein (Fleisch/Fisch/Ei/vegan) ----------------
  F("chicken", "Hähnchenbrust", "Protein", "g", 100, 165, 31, 0, 3.6, ["protein"]),
  F("chicken-thigh", "Hähnchenschenkel", "Protein", "g", 100, 209, 26, 0, 11, ["protein"]),
  F("turkey", "Putenbrust", "Protein", "g", 100, 135, 29, 0, 1, ["protein"]),
  F("beef", "Rindfleisch (mager)", "Protein", "g", 100, 187, 26, 0, 9, ["protein"]),
  F("beef-mince", "Rinderhack (15 % Fett)", "Protein", "g", 100, 215, 19, 0, 15, ["protein", "fat"]),
  F("pork", "Schweinefilet", "Protein", "g", 100, 143, 21, 0, 6, ["protein"]),
  F("pork-mince", "Schweinehack", "Protein", "g", 100, 263, 17, 0, 21, ["protein", "fat"]),
  F("bacon", "Speck", "Protein", "g", 100, 541, 37, 1, 42, ["protein", "fat"]),
  F("ham", "Kochschinken", "Protein", "g", 100, 107, 18, 1, 3, ["protein"]),
  F("salami", "Salami", "Protein", "g", 100, 378, 22, 1, 32, ["protein", "fat"]),
  F("sausage", "Bratwurst", "Protein", "Stück", 1, 280, 12, 2, 25, ["protein", "fat"]),
  F("salmon", "Lachs", "Protein", "g", 100, 208, 20, 0, 13, ["protein", "fat"]),
  F("tuna", "Thunfisch (Dose)", "Protein", "g", 100, 116, 26, 0, 1, ["protein"]),
  F("cod", "Kabeljau", "Protein", "g", 100, 82, 18, 0, 0.7, ["protein"]),
  F("trout", "Forelle", "Protein", "g", 100, 119, 21, 0, 3.5, ["protein"]),
  F("shrimp", "Garnelen", "Protein", "g", 100, 99, 24, 0.2, 0.3, ["protein"]),
  F("egg", "Ei", "Protein", "Stück", 1, 78, 6.3, 0.6, 5.3, ["protein", "fat"]),
  F("eggwhite", "Eiklar", "Protein", "Stück", 1, 17, 3.6, 0.2, 0.1, ["protein"]),
  F("tofu", "Tofu", "Protein", "g", 100, 144, 15, 3, 9, ["protein"]),
  F("seitan", "Seitan", "Protein", "g", 100, 141, 25, 4, 2, ["protein"]),
  F("tempeh", "Tempeh", "Protein", "g", 100, 192, 20, 8, 11, ["protein", "fat"]),

  // ---------------- Milchprodukte ----------------
  F("quark", "Magerquark", "Milchprodukte", "g", 100, 67, 12, 4, 0.3, ["protein"]),
  F("quark40", "Quark (40 %)", "Milchprodukte", "g", 100, 145, 11, 3, 11, ["protein", "fat"]),
  F("skyr", "Skyr", "Milchprodukte", "g", 100, 63, 11, 4, 0.2, ["protein"]),
  F("greekyog", "Griechischer Joghurt", "Milchprodukte", "g", 100, 97, 9, 4, 5, ["protein"]),
  F("yogurt", "Joghurt natur (3,5 %)", "Milchprodukte", "g", 100, 61, 3.5, 4.7, 3.5, []),
  F("cottage", "Hüttenkäse", "Milchprodukte", "g", 100, 98, 11, 3, 4.3, ["protein"]),
  F("milk", "Milch (3,5 %)", "Milchprodukte", "g", 100, 64, 3.4, 4.8, 3.6, []),
  F("milk-low", "Milch (1,5 %)", "Milchprodukte", "g", 100, 47, 3.4, 4.9, 1.5, []),
  F("milk-oat", "Hafermilch", "Milchprodukte", "g", 100, 46, 0.3, 7, 1.5, []),
  F("gouda", "Gouda", "Milchprodukte", "g", 30, 107, 7.5, 0, 8.5, ["protein", "fat"]),
  F("mozzarella", "Mozzarella", "Milchprodukte", "g", 100, 254, 18, 1, 20, ["protein", "fat"]),
  F("parmesan", "Parmesan", "Milchprodukte", "g", 20, 80, 7, 0, 6, ["protein", "fat"]),
  F("feta", "Feta", "Milchprodukte", "g", 50, 132, 7, 0.5, 11, ["protein", "fat"]),
  F("cream-cheese", "Frischkäse", "Milchprodukte", "g", 30, 78, 2, 1, 7.5, ["fat"]),
  F("butter", "Butter", "Milchprodukte", "g", 10, 72, 0.1, 0.1, 8, ["fat"]),

  // ---------------- Kohlenhydrate ----------------
  F("rice", "Reis (gekocht)", "Kohlenhydrate", "g", 100, 130, 2.7, 28, 0.3, ["carb"]),
  F("rice-brown", "Vollkornreis (gekocht)", "Kohlenhydrate", "g", 100, 123, 2.7, 26, 1, ["carb"]),
  F("pasta", "Nudeln (gekocht)", "Kohlenhydrate", "g", 100, 158, 6, 31, 0.9, ["carb"]),
  F("pasta-wholemeal", "Vollkornnudeln (gekocht)", "Kohlenhydrate", "g", 100, 149, 6, 27, 1.5, ["carb"]),
  F("potato", "Kartoffeln (gekocht)", "Kohlenhydrate", "g", 100, 87, 2, 20, 0.1, ["carb"]),
  F("sweetpotato", "Süßkartoffel", "Kohlenhydrate", "g", 100, 90, 2, 21, 0.1, ["carb"]),
  F("couscous", "Couscous (gekocht)", "Kohlenhydrate", "g", 100, 112, 3.8, 23, 0.2, ["carb"]),
  F("quinoa", "Quinoa (gekocht)", "Kohlenhydrate", "g", 100, 120, 4.4, 21, 1.9, ["carb", "protein"]),
  F("bulgur", "Bulgur (gekocht)", "Kohlenhydrate", "g", 100, 83, 3, 19, 0.2, ["carb"]),
  F("oats", "Haferflocken", "Kohlenhydrate", "g", 100, 372, 13, 59, 7, ["carb"]),
  F("muesli", "Müsli", "Kohlenhydrate", "g", 100, 367, 9, 60, 9, ["carb"]),
  F("cornflakes", "Cornflakes", "Kohlenhydrate", "g", 100, 357, 7, 84, 0.9, ["carb"]),
  F("granola", "Granola", "Kohlenhydrate", "g", 100, 471, 10, 64, 20, ["carb", "fat"]),

  // ---------------- Backwaren ----------------
  F("bread", "Vollkornbrot", "Backwaren", "Stück", 1, 110, 5, 19, 1.5, ["carb"]),
  F("bread-white", "Weißbrot (Scheibe)", "Backwaren", "Stück", 1, 97, 3, 18, 1, ["carb"]),
  F("toast", "Toastbrot (Scheibe)", "Backwaren", "Stück", 1, 75, 2.5, 13, 1, ["carb"]),
  F("roll", "Brötchen", "Backwaren", "Stück", 1, 150, 5, 29, 1.5, ["carb"]),
  F("roll-wholemeal", "Vollkornbrötchen", "Backwaren", "Stück", 1, 160, 6, 28, 2, ["carb"]),
  F("bagel", "Bagel", "Backwaren", "Stück", 1, 250, 10, 48, 1.5, ["carb"]),
  F("croissant", "Croissant", "Backwaren", "Stück", 1, 231, 5, 26, 12, ["carb", "fat", "snack"]),
  F("pretzel", "Brezel", "Backwaren", "Stück", 1, 230, 6, 46, 2, ["carb"]),
  F("wrap", "Tortilla-Wrap", "Backwaren", "Stück", 1, 150, 4, 25, 4, ["carb"]),
  F("crispbread", "Knäckebrot", "Backwaren", "Stück", 1, 35, 1, 7, 0.3, ["carb"]),

  // ---------------- Obst ----------------
  F("banana", "Banane", "Obst", "Stück", 1, 105, 1.3, 27, 0.4, ["fruit", "carb"]),
  F("apple", "Apfel", "Obst", "Stück", 1, 95, 0.5, 25, 0.3, ["fruit"]),
  F("orange", "Orange", "Obst", "Stück", 1, 62, 1.2, 15, 0.2, ["fruit"]),
  F("pear", "Birne", "Obst", "Stück", 1, 101, 0.6, 27, 0.2, ["fruit"]),
  F("grapes", "Weintrauben", "Obst", "g", 100, 69, 0.7, 18, 0.2, ["fruit"]),
  F("berries", "Beeren", "Obst", "g", 100, 52, 1, 12, 0.3, ["fruit", "veg"]),
  F("strawberry", "Erdbeeren", "Obst", "g", 100, 32, 0.7, 8, 0.3, ["fruit"]),
  F("blueberry", "Heidelbeeren", "Obst", "g", 100, 57, 0.7, 14, 0.3, ["fruit"]),
  F("mango", "Mango", "Obst", "g", 100, 60, 0.8, 15, 0.4, ["fruit"]),
  F("pineapple", "Ananas", "Obst", "g", 100, 50, 0.5, 13, 0.1, ["fruit"]),
  F("kiwi", "Kiwi", "Obst", "Stück", 1, 42, 0.8, 10, 0.4, ["fruit"]),
  F("watermelon", "Wassermelone", "Obst", "g", 100, 30, 0.6, 8, 0.2, ["fruit"]),
  F("dates", "Datteln", "Obst", "Stück", 1, 66, 0.4, 18, 0, ["fruit", "snack"]),

  // ---------------- Gemüse ----------------
  F("broccoli", "Brokkoli", "Gemüse", "g", 100, 34, 2.8, 7, 0.4, ["veg"]),
  F("spinach", "Spinat", "Gemüse", "g", 100, 23, 2.9, 3.6, 0.4, ["veg"]),
  F("greens", "Gemüse-Mix", "Gemüse", "g", 100, 40, 2, 7, 0.5, ["veg"]),
  F("cucumber", "Gurke", "Gemüse", "g", 100, 15, 0.7, 3.6, 0.1, ["veg"]),
  F("tomato", "Tomate", "Gemüse", "g", 100, 18, 0.9, 3.9, 0.2, ["veg"]),
  F("pepper", "Paprika", "Gemüse", "g", 100, 31, 1, 6, 0.3, ["veg"]),
  F("carrot", "Karotte", "Gemüse", "g", 100, 41, 0.9, 10, 0.2, ["veg"]),
  F("zucchini", "Zucchini", "Gemüse", "g", 100, 17, 1.2, 3, 0.3, ["veg"]),
  F("salad", "Blattsalat", "Gemüse", "g", 100, 15, 1.4, 2.9, 0.2, ["veg"]),
  F("mushroom", "Champignons", "Gemüse", "g", 100, 22, 3.1, 3.3, 0.3, ["veg"]),
  F("onion", "Zwiebel", "Gemüse", "g", 100, 40, 1.1, 9, 0.1, ["veg"]),
  F("cauliflower", "Blumenkohl", "Gemüse", "g", 100, 25, 1.9, 5, 0.3, ["veg"]),
  F("greenbeans", "Grüne Bohnen", "Gemüse", "g", 100, 31, 1.8, 7, 0.1, ["veg"]),
  F("corn", "Mais", "Gemüse", "g", 100, 86, 3.2, 19, 1.2, ["veg", "carb"]),
  F("avocado", "Avocado", "Gemüse", "Stück", 1, 240, 3, 12, 22, ["fat"]),

  // ---------------- Hülsenfrüchte ----------------
  F("lentils", "Linsen (gekocht)", "Hülsenfrüchte", "g", 100, 116, 9, 20, 0.4, ["protein", "carb"]),
  F("chickpeas", "Kichererbsen (gekocht)", "Hülsenfrüchte", "g", 100, 164, 9, 27, 2.6, ["protein", "carb"]),
  F("kidneybeans", "Kidneybohnen (gekocht)", "Hülsenfrüchte", "g", 100, 127, 9, 23, 0.5, ["protein", "carb"]),
  F("blackbeans", "Schwarze Bohnen (gekocht)", "Hülsenfrüchte", "g", 100, 132, 9, 24, 0.5, ["protein", "carb"]),
  F("peas", "Erbsen", "Hülsenfrüchte", "g", 100, 81, 5, 14, 0.4, ["veg", "protein"]),
  F("edamame", "Edamame", "Hülsenfrüchte", "g", 100, 121, 12, 9, 5, ["protein"]),

  // ---------------- Nüsse & Fette ----------------
  F("almonds", "Mandeln", "Nüsse & Fette", "g", 30, 174, 6, 6, 15, ["fat", "snack"]),
  F("walnuts", "Walnüsse", "Nüsse & Fette", "g", 30, 196, 4.5, 4, 20, ["fat", "snack"]),
  F("cashews", "Cashews", "Nüsse & Fette", "g", 30, 166, 5, 9, 13, ["fat", "snack"]),
  F("peanuts", "Erdnüsse", "Nüsse & Fette", "g", 30, 170, 8, 5, 14, ["fat", "snack", "protein"]),
  F("peanutbutter", "Erdnussbutter", "Nüsse & Fette", "g", 20, 118, 5, 4, 10, ["fat", "snack"]),
  F("oliveoil", "Olivenöl", "Nüsse & Fette", "g", 10, 88, 0, 0, 10, ["fat"]),
  F("coconutoil", "Kokosöl", "Nüsse & Fette", "g", 10, 86, 0, 0, 10, ["fat"]),
  F("chia", "Chiasamen", "Nüsse & Fette", "g", 15, 73, 2.5, 6, 4.6, ["fat"]),
  F("flaxseed", "Leinsamen", "Nüsse & Fette", "g", 15, 80, 2.7, 4, 6, ["fat"]),

  // ---------------- Snacks & Süßes ----------------
  F("darkchoc", "Zartbitterschokolade", "Snacks & Süßes", "g", 20, 120, 1.5, 9, 8, ["snack", "fat"]),
  F("milkchoc", "Milchschokolade", "Snacks & Süßes", "g", 20, 108, 1.5, 11, 6, ["snack", "fat"]),
  F("ricecake", "Reiswaffel", "Snacks & Süßes", "Stück", 1, 35, 0.7, 7, 0.3, ["snack", "carb"]),
  F("proteinbar", "Proteinriegel", "Snacks & Süßes", "Stück", 1, 200, 20, 20, 6, ["snack", "protein"]),
  F("granolabar", "Müsliriegel", "Snacks & Süßes", "Stück", 1, 120, 2, 19, 4, ["snack", "carb"]),
  F("chips", "Chips (Portion)", "Snacks & Süßes", "g", 30, 160, 2, 15, 10, ["snack", "fat"]),
  F("haribo", "Fruchtgummi", "Snacks & Süßes", "g", 30, 103, 2, 23, 0, ["snack"]),
  F("snickers", "Snickers", "Snacks & Süßes", "Stück", 1, 250, 4, 32, 12, ["snack", "fat"]),
  F("kitkat", "KitKat (4 Riegel)", "Snacks & Süßes", "Stück", 1, 233, 3, 29, 12, ["snack", "fat"]),
  F("donut", "Donut", "Snacks & Süßes", "Stück", 1, 250, 3, 31, 12, ["snack", "fat"]),
  F("icecream", "Eiscreme (Kugel)", "Snacks & Süßes", "Stück", 1, 130, 2, 16, 7, ["snack", "fat"]),
  F("popcorn", "Popcorn", "Snacks & Süßes", "g", 30, 116, 3, 19, 4, ["snack", "carb"]),

  // ---------------- Getränke ----------------
  F("cola", "Cola (330 ml)", "Getränke", "Stück", 1, 139, 0, 35, 0, []),
  F("cola-zero", "Cola Zero (330 ml)", "Getränke", "Stück", 1, 1, 0, 0, 0, []),
  F("juice-apple", "Apfelsaft (250 ml)", "Getränke", "Stück", 1, 115, 0.3, 28, 0.1, []),
  F("juice-orange", "Orangensaft (250 ml)", "Getränke", "Stück", 1, 110, 1.7, 26, 0.5, []),
  F("beer", "Bier (330 ml)", "Getränke", "Stück", 1, 142, 1.5, 11, 0, []),
  F("wine", "Wein (200 ml)", "Getränke", "Stück", 1, 166, 0.2, 5, 0, []),
  F("energy", "Energy Drink (250 ml)", "Getränke", "Stück", 1, 113, 0, 28, 0, []),
  F("latte", "Latte Macchiato", "Getränke", "Stück", 1, 120, 6, 12, 5, []),
  F("cappuccino", "Cappuccino", "Getränke", "Stück", 1, 74, 4, 6, 4, []),
  F("coffee-black", "Kaffee schwarz", "Getränke", "Stück", 1, 2, 0.1, 0, 0, []),
  F("whey", "Whey-Protein", "Getränke", "Portion", 1, 120, 24, 3, 2, ["protein"]),
  F("casein", "Casein-Protein", "Getränke", "Portion", 1, 110, 23, 3, 1, ["protein"]),
  F("protshake-rtd", "Protein-Shake (fertig, 330 ml)", "Getränke", "Stück", 1, 150, 25, 6, 3, ["protein"]),
  F("smoothie", "Smoothie (250 ml)", "Getränke", "Stück", 1, 150, 2, 33, 1, ["fruit"]),

  // ---------------- Fertiggericht ----------------
  F("frozenpizza", "Tiefkühl-Pizza (ganze)", "Fertiggericht", "Stück", 1, 760, 30, 88, 30, ["carb", "fat"]),
  F("lasagne-rtd", "Lasagne (Fertig, Portion)", "Fertiggericht", "Portion", 1, 520, 24, 45, 26, ["carb", "fat", "protein"]),
  F("maultaschen", "Maultaschen (Portion)", "Fertiggericht", "Portion", 1, 430, 20, 45, 18, ["carb", "protein"]),
  F("ravioli-can", "Ravioli (Dose)", "Fertiggericht", "Portion", 1, 380, 14, 58, 10, ["carb"]),
  F("instant-noodles", "Instant-Nudeln", "Fertiggericht", "Stück", 1, 385, 8, 54, 15, ["carb", "fat"]),
  F("frozen-veg-pan", "Gemüsepfanne (TK, Portion)", "Fertiggericht", "Portion", 1, 180, 7, 22, 6, ["veg"]),
  F("fish-fingers", "Fischstäbchen", "Fertiggericht", "Stück", 1, 60, 4, 5, 3, ["protein"]),
  F("chicken-nuggets-frozen", "Chicken Nuggets (TK)", "Fertiggericht", "Stück", 1, 48, 2.5, 3, 3, ["protein", "fat"]),
  F("fries-frozen", "Pommes (Ofen, Portion)", "Fertiggericht", "g", 150, 220, 3, 33, 8, ["carb"]),

  // ---------------- Fast Food: McDonald's ----------------
  F("mcd-bigmac", "Big Mac (McDonald's)", "Fast Food", "Stück", 1, 503, 26, 42, 25, ["protein", "carb", "fat"]),
  F("mcd-cheeseburger", "Cheeseburger (McDonald's)", "Fast Food", "Stück", 1, 301, 16, 31, 12, ["protein", "carb"]),
  F("mcd-hamburger", "Hamburger (McDonald's)", "Fast Food", "Stück", 1, 256, 13, 31, 8, ["protein", "carb"]),
  F("mcd-mcroyalts", "McRoyal TS (McDonald's)", "Fast Food", "Stück", 1, 440, 22, 33, 24, ["protein", "carb", "fat"]),
  F("mcd-bigtasty", "Big Tasty (McDonald's)", "Fast Food", "Stück", 1, 840, 45, 41, 54, ["protein", "fat"]),
  F("mcd-mcchicken", "McChicken (McDonald's)", "Fast Food", "Stück", 1, 367, 15, 38, 17, ["protein", "carb"]),
  F("mcd-fishmac", "Filet-o-Fish (McDonald's)", "Fast Food", "Stück", 1, 333, 15, 37, 14, ["protein", "carb"]),
  F("mcd-nuggets6", "McNuggets 6er (McDonald's)", "Fast Food", "Portion", 1, 259, 15, 16, 15, ["protein", "fat"]),
  F("mcd-nuggets9", "McNuggets 9er (McDonald's)", "Fast Food", "Portion", 1, 388, 22, 24, 23, ["protein", "fat"]),
  F("mcd-fries-m", "Pommes mittel (McDonald's)", "Fast Food", "Portion", 1, 337, 4, 43, 16, ["carb", "fat"]),
  F("mcd-fries-l", "Pommes groß (McDonald's)", "Fast Food", "Portion", 1, 444, 5, 57, 21, ["carb", "fat"]),
  F("mcd-mcflurry", "McFlurry (McDonald's)", "Fast Food", "Stück", 1, 290, 6, 44, 10, ["snack", "carb"]),
  F("mcd-applepie", "Apfeltasche (McDonald's)", "Fast Food", "Stück", 1, 240, 2, 30, 12, ["snack"]),

  // ---------------- Fast Food: Burger King ----------------
  F("bk-whopper", "Whopper (Burger King)", "Fast Food", "Stück", 1, 630, 28, 49, 35, ["protein", "carb", "fat"]),
  F("bk-cheeseburger", "Cheeseburger (Burger King)", "Fast Food", "Stück", 1, 300, 16, 28, 14, ["protein", "carb"]),
  F("bk-longchicken", "Long Chicken (Burger King)", "Fast Food", "Stück", 1, 480, 20, 45, 24, ["protein", "carb", "fat"]),
  F("bk-chickenfries", "Chicken Fries (Burger King)", "Fast Food", "Portion", 1, 280, 14, 18, 17, ["protein", "fat"]),
  F("bk-nuggets6", "Nuggets 6er (Burger King)", "Fast Food", "Portion", 1, 270, 13, 16, 17, ["protein", "fat"]),
  F("bk-fries-m", "Pommes mittel (Burger King)", "Fast Food", "Portion", 1, 340, 4, 44, 16, ["carb", "fat"]),

  // ---------------- Fast Food: KFC ----------------
  F("kfc-original", "Original Hähnchenteil (KFC)", "Fast Food", "Stück", 1, 280, 22, 9, 18, ["protein", "fat"]),
  F("kfc-hotwings", "Hot Wings 3er (KFC)", "Fast Food", "Portion", 1, 210, 14, 9, 14, ["protein", "fat"]),
  F("kfc-zinger", "Zinger Burger (KFC)", "Fast Food", "Stück", 1, 450, 25, 42, 20, ["protein", "carb", "fat"]),
  F("kfc-popcorn", "Popcorn Chicken (KFC)", "Fast Food", "Portion", 1, 285, 16, 21, 16, ["protein", "fat"]),

  // ---------------- Fast Food: Subway (15 cm) ----------------
  F("sub-chicken", "Subway Hähnchenbrust", "Fast Food", "Stück", 1, 330, 26, 46, 5, ["protein", "carb"]),
  F("sub-teriyaki", "Subway Chicken Teriyaki", "Fast Food", "Stück", 1, 370, 26, 50, 7, ["protein", "carb"]),
  F("sub-bmt", "Subway Italian BMT", "Fast Food", "Stück", 1, 410, 20, 45, 17, ["protein", "carb", "fat"]),
  F("sub-veggie", "Subway Veggie Delite", "Fast Food", "Stück", 1, 230, 9, 44, 3, ["carb", "veg"]),
  F("sub-steak", "Subway Steak & Cheese", "Fast Food", "Stück", 1, 380, 26, 45, 10, ["protein", "carb"]),

  // ---------------- Fast Food: Imbiss / Restaurant ----------------
  F("doner", "Döner Kebab", "Fast Food", "Stück", 1, 650, 35, 55, 30, ["protein", "carb", "fat"]),
  F("durum", "Dürüm Döner", "Fast Food", "Stück", 1, 700, 34, 62, 33, ["protein", "carb", "fat"]),
  F("falafel-doner", "Falafel-Döner", "Fast Food", "Stück", 1, 600, 18, 70, 27, ["carb", "fat"]),
  F("currywurst", "Currywurst mit Pommes", "Fast Food", "Portion", 1, 800, 20, 70, 45, ["carb", "fat", "protein"]),
  F("pizza-margherita", "Pizza Margherita (Stück)", "Fast Food", "Stück", 1, 220, 9, 27, 8, ["carb"]),
  F("pizza-salami", "Pizza Salami (Stück)", "Fast Food", "Stück", 1, 280, 12, 28, 13, ["carb", "fat", "protein"]),
  F("pizza-whole", "Pizza (ganze, Lieferdienst)", "Fast Food", "Stück", 1, 1100, 45, 130, 42, ["carb", "fat"]),
  F("kebab-box", "Kebab-Box mit Pommes", "Fast Food", "Portion", 1, 750, 32, 65, 38, ["protein", "carb", "fat"]),
  F("sushi-roll", "Sushi (8 Stück)", "Fast Food", "Portion", 1, 350, 9, 60, 6, ["carb", "protein"]),
  F("padthai", "Pad Thai (Portion)", "Fast Food", "Portion", 1, 600, 20, 80, 22, ["carb", "protein", "fat"]),
  F("burrito", "Burrito", "Fast Food", "Stück", 1, 620, 27, 70, 24, ["carb", "protein", "fat"]),
  F("fish-chips", "Fish & Chips", "Fast Food", "Portion", 1, 840, 32, 80, 42, ["carb", "protein", "fat"]),
  F("hotdog", "Hot Dog", "Fast Food", "Stück", 1, 290, 10, 23, 17, ["protein", "carb", "fat"]),

  // ---------------- Saucen & Aufstriche ----------------
  F("ketchup", "Ketchup", "Saucen", "g", 20, 21, 0.2, 5, 0, []),
  F("mayo", "Mayonnaise", "Saucen", "g", 20, 144, 0.2, 1, 16, ["fat"]),
  F("mustard", "Senf", "Saucen", "g", 20, 13, 0.9, 1, 0.6, []),
  F("bbq", "BBQ-Sauce", "Saucen", "g", 20, 35, 0.3, 8, 0.1, []),
  F("honey", "Honig", "Saucen", "g", 20, 61, 0.1, 16, 0, []),
  F("jam", "Marmelade", "Saucen", "g", 20, 50, 0.1, 12, 0, []),
  F("nutella", "Nuss-Nougat-Creme", "Saucen", "g", 20, 108, 1.2, 11, 6, ["snack", "fat"]),
  F("pesto", "Pesto", "Saucen", "g", 20, 90, 1.5, 1.5, 9, ["fat"]),
];

// Makros eines Lebensmittels für eine Menge (qty in der jeweiligen Einheit).
export function scaleFood(food: Food, qty: number): Macros {
  const f = qty / food.base;
  return {
    kcal: Math.round(food.kcal * f),
    protein: Math.round(food.protein * f * 10) / 10,
    carbs: Math.round(food.carbs * f * 10) / 10,
    fat: Math.round(food.fat * f * 10) / 10,
  };
}

export function defaultQty(food: Food): number {
  if (food.unit === "Stück" || food.unit === "Portion") return 1;
  return 100; // g
}

/* ---------------- Mahlzeit-Empfehlungen (gesund) ---------------- */

export type MealRec = { id: string; name: string; desc: string; macros: Macros };
const M = (kcal: number, p: number, c: number, f: number): Macros => ({
  kcal,
  protein: p,
  carbs: c,
  fat: f,
});

export const MEALS: MealRec[] = [
  { id: "chicken-rice", name: "Hähnchen, Reis & Brokkoli", desc: "150 g Hähnchen · 150 g Reis · 150 g Brokkoli", macros: M(495, 55, 53, 7) },
  { id: "quark-bowl", name: "Quark-Bowl", desc: "250 g Magerquark · 100 g Beeren · 40 g Haferflocken", macros: M(369, 36, 46, 4) },
  { id: "salmon-potato", name: "Lachs mit Kartoffeln", desc: "150 g Lachs · 200 g Kartoffeln · Gemüse", macros: M(526, 36, 47, 20) },
  { id: "oat-whey", name: "Haferflocken-Shake", desc: "60 g Haferflocken · 1 Whey · 1 Banane", macros: M(448, 33, 65, 7) },
  { id: "eggs-bread", name: "Rührei mit Vollkornbrot", desc: "3 Eier · 2 Scheiben Vollkornbrot · Gemüse", macros: M(484, 31, 46, 20) },
  { id: "tofu-stirfry", name: "Tofu-Pfanne mit Reis", desc: "150 g Tofu · 150 g Reis · 200 g Gemüse", macros: M(491, 31, 61, 15) },
  { id: "tuna-salad", name: "Thunfisch-Salat", desc: "1 Dose Thunfisch · Salat · 1 EL Olivenöl", macros: M(278, 35, 7, 12) },
  { id: "skyr-banana", name: "Skyr mit Banane & Nüssen", desc: "200 g Skyr · 1 Banane · 20 g Mandeln", macros: M(347, 26, 39, 11) },
  { id: "turkey-wrap", name: "Puten-Wrap", desc: "1 Wrap · 120 g Pute · Salat · etwas Frischkäse", macros: M(420, 34, 28, 17) },
  { id: "beef-sweetpotato", name: "Rind mit Süßkartoffel", desc: "150 g mageres Rind · 200 g Süßkartoffel · Gemüse", macros: M(560, 43, 49, 17) },
  { id: "lentil-stew", name: "Linsen-Eintopf", desc: "200 g Linsen · Gemüse · etwas Öl", macros: M(380, 20, 45, 10) },
  { id: "greekyog-granola", name: "Joghurt-Granola-Bowl", desc: "200 g griech. Joghurt · 40 g Granola · Beeren", macros: M(430, 22, 38, 22) },
  { id: "shrimp-rice", name: "Garnelen-Reispfanne", desc: "150 g Garnelen · 150 g Reis · Gemüse", macros: M(420, 40, 50, 4) },
  { id: "cottage-toast", name: "Hüttenkäse-Toast", desc: "2 Scheiben Vollkorn · 150 g Hüttenkäse · Tomate", macros: M(390, 25, 42, 9) },
];

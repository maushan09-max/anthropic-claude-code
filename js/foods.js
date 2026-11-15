'use strict';
/* Built-in food values for automatic macro calculation. Approximate, typical values.
   unit 'g'/'ml' = per 100 g/ml; other units = per 1 of that unit. [name, unit, protein, carbs, fat, kcal] */
const FOOD_DB = [
  // Protein
  ['Chicken breast (cooked)', 'g', 31, 0, 3.6, 165], ['Chicken breast (raw)', 'g', 22.5, 0, 2.6, 120], ['Chicken thigh (cooked)', 'g', 26, 0, 11, 209],
  ['Egg', 'piece', 6.3, 0.4, 4.8, 72], ['Egg white', 'piece', 3.6, 0.2, 0.1, 17],
  ['Tuna (fresh, cooked)', 'g', 29.9, 0, 1, 132], ['Tuna (canned in water)', 'g', 26, 0, 1, 116], ['Tuna (canned in oil, drained)', 'g', 29, 0, 8, 198],
  ['Reef fish (cooked)', 'g', 24, 0, 1.5, 120], ['Salmon (cooked)', 'g', 22, 0, 12, 206], ['Prawns (cooked)', 'g', 24, 0.2, 0.3, 99],
  ['Beef, lean (cooked)', 'g', 26, 0, 11, 217], ['Mutton (cooked)', 'g', 25.6, 0, 16.5, 258],
  ['Tofu (firm)', 'g', 17, 2.8, 8.7, 144], ['Paneer', 'g', 18, 1.2, 20, 265], ['Whey protein', 'scoop', 24, 3, 1.5, 120],
  // Dairy & fats
  ['Milk (full cream)', 'ml', 3.3, 4.8, 3.3, 61], ['Milk (low fat)', 'ml', 3.4, 5, 1, 42], ['Yogurt (plain)', 'g', 3.5, 4.7, 3.3, 61],
  ['Greek yogurt (plain, non-fat)', 'g', 10, 3.6, 0.4, 59], ['Cheddar cheese', 'g', 25, 1.3, 33, 403], ['Butter', 'g', 0.9, 0.1, 81, 717],
  ['Olive oil', 'tbsp', 0, 0, 13.5, 119], ['Coconut oil', 'tbsp', 0, 0, 13.6, 121], ['Vegetable oil', 'tbsp', 0, 0, 13.6, 120],
  ['Coconut (grated, fresh)', 'g', 3.3, 15, 33, 354], ['Coconut milk (canned)', 'ml', 2, 2.8, 21, 197],
  // Carbs
  ['Rice, white (cooked)', 'g', 2.7, 28, 0.3, 130], ['Rice, brown (cooked)', 'g', 2.7, 25.6, 1, 123], ['Pasta (cooked)', 'g', 5.8, 31, 0.9, 158],
  ['Noodles (cooked)', 'g', 4.5, 25, 2.1, 138], ['Roshi / chapati', 'piece', 4.4, 18.4, 3, 119], ['Bread, white', 'slice', 2.3, 12.3, 0.8, 66],
  ['Bread, wholemeal', 'slice', 3.6, 11.5, 1, 69], ['Oats (dry)', 'g', 13.2, 67.7, 6.5, 379], ['Cornflakes', 'g', 7, 84, 0.9, 357],
  ['Potato (boiled)', 'g', 1.9, 20, 0.1, 87], ['Sweet potato (boiled)', 'g', 1.4, 17.7, 0.1, 76],
  ['Lentils / dhal (cooked)', 'g', 9, 20, 0.4, 116], ['Chickpeas (cooked)', 'g', 8.9, 27.4, 2.6, 164],
  // Fruit
  ['Banana', 'piece', 1.3, 27, 0.4, 105], ['Apple', 'piece', 0.5, 25, 0.3, 95], ['Orange', 'piece', 1.2, 15.4, 0.2, 62],
  ['Dates (medjool)', 'piece', 0.4, 18, 0, 66], ['Papaya', 'g', 0.5, 11, 0.3, 43], ['Mango', 'g', 0.8, 15, 0.4, 60],
  ['Watermelon', 'g', 0.6, 7.6, 0.2, 30], ['Avocado', 'g', 2, 8.5, 14.7, 160],
  // Vegetables
  ['Broccoli', 'g', 2.8, 7, 0.4, 34], ['Spinach', 'g', 2.9, 3.6, 0.4, 23], ['Carrot', 'g', 0.9, 9.6, 0.2, 41],
  ['Cucumber', 'g', 0.7, 3.6, 0.1, 15], ['Tomato', 'g', 0.9, 3.9, 0.2, 18], ['Onion', 'g', 1.1, 9.3, 0.1, 40],
  // Nuts, sweeteners
  ['Almonds', 'g', 21, 22, 49, 579], ['Peanuts', 'g', 26, 16, 49, 567], ['Peanut butter', 'tbsp', 4, 3.2, 8, 94],
  ['Sugar', 'tsp', 0, 4, 0, 16], ['Honey', 'tbsp', 0, 17.3, 0, 64],
].map(([name, unit, p, c, f, kcal]) => ({ name, unit, p, c, f, kcal, builtin: true }));

/** Your own saved foods first, then the built-in list. */
const findFood = (name) => {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  return db.foods.find((x) => x.name.toLowerCase() === n) || FOOD_DB.find((x) => x.name.toLowerCase() === n) || null;
};
const allFoodNames = () => [...new Set([...db.foods.map((f) => f.name), ...FOOD_DB.map((f) => f.name)])];

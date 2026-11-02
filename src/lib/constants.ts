export const COIN_USD = 0.01;

export const COIN_PACKAGES = [
  { id: "spark", name: "Spark", coins: 100, amount: 0.99 },
  { id: "glow", name: "Glow", coins: 550, amount: 4.99 },
  { id: "blaze", name: "Blaze", coins: 1200, amount: 9.99 },
  { id: "crown", name: "Crown Chest", coins: 6500, amount: 39.99 },
] as const;

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
] as const;

export const PLACES = [
  { name: "Sydney", latitude: -33.8688, longitude: 151.2093 },
  { name: "São Paulo", latitude: -23.5558, longitude: -46.6396 },
  { name: "Berlin", latitude: 52.52, longitude: 13.405 },
  { name: "Lagos", latitude: 6.5244, longitude: 3.3792 },
  { name: "Seoul", latitude: 37.5665, longitude: 126.978 },
  { name: "Paris", latitude: 48.8566, longitude: 2.3522 },
  { name: "Los Angeles", latitude: 34.0522, longitude: -118.2437 },
  { name: "London", latitude: 51.5072, longitude: -0.1276 },
  { name: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { name: "New York", latitude: 40.7128, longitude: -74.006 },
  { name: "Singapore", latitude: 1.3521, longitude: 103.8198 },
] as const;

export const GIFT_CATALOG = [
  { id: "gift_like", name: "Like", icon: "❤️", coin_cost: 10, animation_url: "/gifts/like.svg" },
  { id: "gift_fire", name: "Fire", icon: "🔥", coin_cost: 50, animation_url: "/gifts/fire.svg" },
  { id: "gift_star", name: "Star", icon: "⭐", coin_cost: 100, animation_url: "/gifts/star.svg" },
  { id: "gift_rocket", name: "Rocket", icon: "🚀", coin_cost: 500, animation_url: "/gifts/rocket.svg" },
  { id: "gift_crown", name: "Crown", icon: "👑", coin_cost: 1000, animation_url: "/gifts/crown.svg" },
] as const;

export const CATEGORY_CATALOG = [
  { id: "cat_music", name: "Music", icon: "🎵" },
  { id: "cat_gaming", name: "Gaming", icon: "🎮" },
  { id: "cat_chat", name: "Just Chatting", icon: "💬" },
  { id: "cat_art", name: "Art", icon: "🎨" },
  { id: "cat_fitness", name: "Fitness", icon: "💪" },
  { id: "cat_irl", name: "IRL", icon: "📍" },
  { id: "cat_comedy", name: "Comedy", icon: "🎭" },
  { id: "cat_education", name: "Education", icon: "📚" },
  { id: "cat_nightlife", name: "Nightlife", icon: "🌙" },
] as const;

export const RATING_CATALOG = [
  {
    id: "rating_g",
    name: "General Audience (G)",
    minimum_age: 0,
    description: "Suitable for all ages.",
  },
  {
    id: "rating_teen",
    name: "Teen (13+)",
    minimum_age: 13,
    description: "Mild language or suggestive themes. No sexual content.",
  },
  {
    id: "rating_mature",
    name: "Mature (18+)",
    minimum_age: 18,
    description: "Sexual content for adults 18 and older.",
  },
  {
    id: "rating_restricted",
    name: "Restricted Content",
    minimum_age: 18,
    description: "Explicit sexual content and nudity. Adults 18 and older only.",
  },
] as const;

export const REPORT_REASONS = ["Spam", "Harassment", "Violence", "Copyright"] as const;

export const AVATARS = ["rose", "iris", "gold", "sea", "lime", "ember", "sky", "wine"] as const;

export const THUMB_BY_CATEGORY: Record<string, string> = {
  Music: "grad:violet",
  Gaming: "grad:iris",
  "Just Chatting": "grad:rose",
  Art: "grad:gold",
  Fitness: "grad:lime",
  IRL: "grad:sea",
  Comedy: "grad:ember",
  Education: "grad:sky",
  Nightlife: "grad:wine",
};

export const DEMO_OAUTH: Record<string, string> = {
  google: "alex@seemee.demo",
  apple: "sam@seemee.demo",
  microsoft: "morgan@seemee.demo",
};

export function isAdultRating(name: string) {
  return name.startsWith("Mature") || name.startsWith("Restricted");
}

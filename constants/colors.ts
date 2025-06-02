export const NODE_COLORS = {
  person: "#9e58bd", // Purple
  category: "#00828e", // Teal
  organization: "#f59e0b", // Amber
  policy: "#1c005f", // Violet
  book: "#ef4444", // Red
  virtue: "#00828e", // Light Green
  event: "#10b981", // Emerald
  concept: "#3b82f6", // Blue
  language: "#f97316", // Orange
  geo: "#6366f1", // Indigo
} as const;

export type NodeType = keyof typeof NODE_COLORS; 
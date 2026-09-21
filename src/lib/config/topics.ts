export type SuggestedTopic = {
  id: string;
  label: string;
  fieldIds: string[];
};

export const suggestedTopics: SuggestedTopic[] = [
  { id: "product-strategy", label: "Product strategy", fieldIds: ["product-management"] },
  { id: "product-sense", label: "Product sense", fieldIds: ["product-management"] },
  { id: "execution", label: "Execution / delivery", fieldIds: ["product-management", "operations"] },
  { id: "behavioral", label: "Behavioral", fieldIds: [] },
  { id: "system-design", label: "System design", fieldIds: ["software-engineering"] },
  { id: "coding", label: "Coding", fieldIds: ["software-engineering"] },
  { id: "sql-case", label: "SQL / analytics case", fieldIds: ["data-analytics"] },
  { id: "metrics", label: "Metrics & experimentation", fieldIds: ["product-management", "data-analytics", "marketing"] },
  { id: "portfolio", label: "Portfolio walkthrough", fieldIds: ["design-ux"] },
  { id: "whiteboard-design", label: "Design critique / whiteboard", fieldIds: ["design-ux"] },
  { id: "growth-case", label: "Growth case", fieldIds: ["marketing"] },
  { id: "sales-roleplay", label: "Discovery / role-play", fieldIds: ["sales"] },
  { id: "market-sizing", label: "Market sizing", fieldIds: ["consulting", "finance"] },
  { id: "case-interview", label: "Case interview", fieldIds: ["consulting"] },
  { id: "people-leadership", label: "People leadership", fieldIds: ["people-hr", "product-management"] },
];

export function topicsForField(fieldId: string) {
  return suggestedTopics.filter(
    (topic) => topic.fieldIds.length === 0 || topic.fieldIds.includes(fieldId)
  );
}

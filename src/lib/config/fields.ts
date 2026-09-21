export type ProfessionalField = {
  id: string;
  label: string;
  aliases: string[];
};

export const professionalFields: ProfessionalField[] = [
  {
    id: "product-management",
    label: "Product Management",
    aliases: ["pm", "product manager", "product", "product mgmt"],
  },
  {
    id: "software-engineering",
    label: "Software Engineering",
    aliases: ["swe", "software", "engineering", "developer", "backend", "frontend"],
  },
  {
    id: "data-analytics",
    label: "Data & Analytics",
    aliases: ["data", "analytics", "data science", "data scientist", "bi"],
  },
  {
    id: "design-ux",
    label: "Design & UX",
    aliases: ["ux", "ui", "product design", "designer", "user experience"],
  },
  {
    id: "marketing",
    label: "Marketing",
    aliases: ["growth", "brand", "content marketing", "product marketing"],
  },
  {
    id: "sales",
    label: "Sales",
    aliases: ["account executive", "ae", "business development", "sdr"],
  },
  {
    id: "finance",
    label: "Finance",
    aliases: ["fp&a", "investment banking", "accounting", "financial analyst"],
  },
  {
    id: "operations",
    label: "Operations",
    aliases: ["ops", "strategy & operations", "bizops", "business operations"],
  },
  {
    id: "people-hr",
    label: "People & HR",
    aliases: ["hr", "people operations", "recruiting", "talent"],
  },
  {
    id: "consulting",
    label: "Consulting",
    aliases: ["management consulting", "strategy consulting", "consultant"],
  },
];

export const OTHER_FIELD_ID = "other";

export function normalizeFieldText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveProfessionalField(input: {
  fieldId: string;
  fieldCustom?: string | null;
}) {
  if (input.fieldId && input.fieldId !== OTHER_FIELD_ID) {
    const canonical = professionalFields.find((field) => field.id === input.fieldId);
    if (canonical) {
      return {
        fieldId: canonical.id,
        fieldCustom: null as string | null,
        label: canonical.label,
        matchKey: `id:${canonical.id}`,
      };
    }
  }

  const custom = normalizeFieldText(input.fieldCustom || "");
  if (!custom) {
    return {
      fieldId: OTHER_FIELD_ID,
      fieldCustom: input.fieldCustom?.trim() || null,
      label: input.fieldCustom?.trim() || "Other",
      matchKey: "id:other",
    };
  }

  const mapped = professionalFields.find(
    (field) =>
      normalizeFieldText(field.label) === custom ||
      field.aliases.some((alias) => normalizeFieldText(alias) === custom)
  );
  if (mapped) {
    return {
      fieldId: mapped.id,
      fieldCustom: null,
      label: mapped.label,
      matchKey: `id:${mapped.id}`,
    };
  }

  return {
    fieldId: OTHER_FIELD_ID,
    fieldCustom: input.fieldCustom?.trim() || custom,
    label: input.fieldCustom?.trim() || custom,
    matchKey: `custom:${custom}`,
  };
}

export function fieldsSharePracticeArea(
  a: { fieldId: string; fieldCustom?: string | null },
  b: { fieldId: string; fieldCustom?: string | null }
) {
  return resolveProfessionalField(a).matchKey === resolveProfessionalField(b).matchKey;
}

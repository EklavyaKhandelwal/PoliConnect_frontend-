export const complaintCategories = [
  "road",
  "water",
  "electricity",
  "cleanliness",
  "health",
  "ration",
  "education",
  "other",
] as const;

export type ComplaintCategory = (typeof complaintCategories)[number];

export const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

export const buildAnnouncementPath = (title) => {
  const date = new Date();
  const yyyyMMdd = date
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  return `announcements/${slugify(title)}-${yyyyMMdd}.pdf`;
};

/**
 * Helper to generate a clean, URL-safe slug from any business name, full name, or text
 */
export function generateCatalogSlug(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")     // replace non-alphanumeric with hyphen
    .replace(/-+/g, "-")             // collapse hyphens
    .replace(/^-|-$/g, "");          // trim leading/trailing hyphens
}

/**
 * Returns the canonical catalog slug for any user/business object
 */
export function getStoreCatalogSlug(user?: any): string {
  if (!user) return "mi-tienda";

  // 1. If explicit businessSlug is set, use it
  if (user.businessSlug && String(user.businessSlug).trim()) {
    return generateCatalogSlug(user.businessSlug);
  }

  // 2. If businessName is present, generate slug from it
  if (user.businessName && String(user.businessName).trim()) {
    const slug = generateCatalogSlug(user.businessName);
    if (slug) return slug;
  }

  // 3. If businessReason is present
  if (user.businessReason && String(user.businessReason).trim()) {
    const slug = generateCatalogSlug(user.businessReason);
    if (slug) return slug;
  }

  // 4. If full name (name + lastName) is present
  const fullName = `${user.name || ""} ${user.lastName || ""}`.trim();
  if (fullName) {
    const slug = generateCatalogSlug(fullName);
    if (slug) return slug;
  }

  // 5. If email prefix is available
  if (user.email && typeof user.email === "string") {
    const prefix = user.email.split("@")[0];
    const slug = generateCatalogSlug(prefix);
    if (slug) return slug;
  }

  // 6. Fallback to user ID (UUID) or mi-tienda
  return user.id || "mi-tienda";
}

/**
 * Returns the full public URL for the store catalog
 */
export function getStoreCatalogUrl(user?: any, origin = window.location.origin): string {
  const slug = getStoreCatalogSlug(user);
  return `${origin}/catalogo/${slug}`;
}

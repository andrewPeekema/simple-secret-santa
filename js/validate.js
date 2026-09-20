// Validate participant names to prevent encoding issues
// Allows: Unicode letters, numbers, spaces, apostrophes, hyphens, periods
// Disallows: & < > and control characters (which cause HTML escaping mismatches)
export function isValidName(name) {
    if (!name || name.length === 0 || name.length > 50) return false;

    // Disallow characters that cause HTML escaping issues or security concerns
    const disallowed = /[&<>\x00-\x1F\x7F]/;
    if (disallowed.test(name)) return false;

    // Must contain at least one letter or number
    const hasAlphanumeric = /[\p{L}\p{N}]/u;
    if (!hasAlphanumeric.test(name)) return false;

    return true;
}

export function getInvalidNameReason(name) {
    if (!name || name.length === 0) return "Name cannot be empty";
    if (name.length > 50) return "Name must be 50 characters or less";
    if (/[&]/.test(name)) return "Name cannot contain '&'";
    if (/[<]/.test(name)) return "Name cannot contain '<'";
    if (/[>]/.test(name)) return "Name cannot contain '>'";
    if (/[\x00-\x1F\x7F]/.test(name)) return "Name contains invalid control characters";
    if (!/[\p{L}\p{N}]/u.test(name)) return "Name must contain at least one letter or number";
    return null;
}

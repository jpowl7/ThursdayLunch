/**
 * Read a JSON request body without letting a malformed one blow up the route.
 * Returns the parsed object, or an empty object when the body is missing, not valid
 * JSON, or not a JSON object. Callers then run their Zod schema over the result, so
 * a bad body turns into the schema's own 400 instead of an uncaught 500.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return {};
}

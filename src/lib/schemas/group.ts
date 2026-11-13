import { z } from "zod";

export const Passcode = z.string().regex(/^\d{4}$/, "Passcode must be exactly 4 digits");

/** Recovery address: trimmed, lowercased, must look like an email. */
export const AdminEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email is too long");

export const CreateGroupSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  passcode: Passcode,
  // Empty string from the form means "none".
  adminEmail: z.union([AdminEmail, z.literal("")]).optional().transform((v) => (v ? v : null)),
});

export const ChangePasscodeSchema = z.object({
  newPasscode: Passcode,
});

export const SetAdminEmailSchema = z.object({
  adminEmail: AdminEmail.nullable(),
});

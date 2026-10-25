/** Bentuk state umum untuk Server Action + useActionState. */
export type FormState =
  | {
      ok?: boolean;
      message?: string;
      errors?: Record<string, string>;
      /** Peringatan non-fatal, mis. GPS di luar radius checkpoint. */
      warning?: string;
    }
  | undefined;

/** Ambil nilai form sebagai string ter-trim, "" bila kosong. */
export function str(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

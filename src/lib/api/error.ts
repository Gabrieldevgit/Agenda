export async function readApiError(res: Response): Promise<never> {
  const body: unknown = await res.json().catch(() => null);
  const b = body as { error?: { message?: unknown; code?: unknown } | unknown; message?: unknown } | null;
  const raw = (b as { error?: { message?: unknown } })?.error && typeof (b as { error?: { message?: unknown } }).error === "object"
    ? (b as { error: { message?: unknown } }).error.message
    : (b as { error?: unknown })?.error ?? (b as { message?: unknown })?.message;
  const message = typeof raw === "string" ? raw : raw != null ? String(raw) : `Request failed (${res.status})`;
  throw new Error(message);
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err);
}

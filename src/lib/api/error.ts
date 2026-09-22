export async function readApiError(res: Response): Promise<never> {
  const body: any = await res.json().catch(() => null);
  const message = body?.error?.message ?? body?.error ?? body?.message ?? `Request failed (${res.status})`;
  throw new Error(typeof message === "string" ? message : JSON.stringify(message));
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in (err as any) && typeof (err as any).message === "string") return (err as any).message;
  return String(err);
}

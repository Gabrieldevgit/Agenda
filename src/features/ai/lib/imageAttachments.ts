export type ImageAttachment = {
  id: string;
  file: File;
  previewUrl: string;
  base64: string; // data URL for vision models
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_COUNT = 4;

export function validateImage(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return "Only PNG, JPG, WebP or GIF allowed.";
  if (file.size > MAX_SIZE) return "Max 5MB per image.";
  return null;
}

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // Keep as data URL for provider
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return `data:${file.type};base64,${b64}`;
}

export async function createAttachment(file: File): Promise<ImageAttachment> {
  const err = validateImage(file);
  if (err) throw new Error(err);
  const base64 = await fileToBase64(file);
  const previewUrl = URL.createObjectURL(file);
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, previewUrl, base64 };
}

export function isVisionModel(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes("vision") || m.includes("gpt-4o") || m.includes("llava") || m.includes("4o");
}

export const ATTACHMENT_LIMITS = { MAX_SIZE, MAX_COUNT, ALLOWED };

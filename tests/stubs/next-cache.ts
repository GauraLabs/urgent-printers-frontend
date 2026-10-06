export const revalidated: { path: string; type?: string }[] = [];

export function revalidatePath(path: string, type?: "page" | "layout"): void {
  revalidated.push({ path, type });
}

export function revalidateTag(): void {}

"use client";

import { supabase } from "./supabase";
import { MEDIA_BUCKET, newPath } from "./storage";

export interface UploadResult {
  storagePath: string;
  publicUrl: string;
}

export async function uploadFile(
  file: Blob,
  prefix: "memories" | "voices",
  ext: string,
  contentType?: string
): Promise<UploadResult> {
  const path = newPath(prefix, ext);
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      contentType: contentType ?? (file instanceof Blob ? file.type : undefined),
      upsert: false
    });
  if (error) throw error;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

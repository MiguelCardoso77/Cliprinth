import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { deleteUpload, UPLOAD_DIR } from "@/lib/storage";

export type UploadResult = { id: string; filename: string };

export class UploadService {

  public saveUpload = async (file: File): Promise<UploadResult> => {
    const id = randomUUID();
    const jobDir = path.join(UPLOAD_DIR, id);
    await mkdir(jobDir, { recursive: true });

    const filePath = path.join(jobDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return { id, filename: file.name };
  };

  public deleteUpload = async (id: string): Promise<void> => {
    await deleteUpload(id);
  };
}

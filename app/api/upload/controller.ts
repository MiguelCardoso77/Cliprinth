import { Result, success, failure } from "@/app/api/utils/response";
import { UploadService, UploadResult } from "./service";

export class UploadController {
  private service = new UploadService();

  public handleUpload = async (formData: FormData): Promise<Result<UploadResult>> => {
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return failure("No File Provided!", 400);
    }

    const result = await this.service.saveUpload(file);

    return success(result);
  };

  public handleDelete = async (id: string): Promise<Result<{ ok: true }>> => {
    await this.service.deleteUpload(id);
    return success({ ok: true });
  };
}

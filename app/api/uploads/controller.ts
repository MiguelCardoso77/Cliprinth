import { Result, success } from "../utils/response";
import { UploadEntry } from "@/lib/storage";
import { UploadsService } from "./service";

export class UploadsController {
  private service = new UploadsService();

  public handleList = async (): Promise<Result<UploadEntry[]>> => {
    const uploads = await this.service.listUploads();
    return success(uploads);
  };
}

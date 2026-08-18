import { listUploads, UploadEntry } from "@/lib/storage";

export class UploadsService {
  public listUploads = async (): Promise<UploadEntry[]> => {
    return listUploads();
  };
}

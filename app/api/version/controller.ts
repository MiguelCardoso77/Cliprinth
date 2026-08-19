import { Result, success } from "../utils/response";
import { versionService, VersionInfo } from "./service";

export class VersionController {
  private service = versionService;

  public handleGet = async (): Promise<Result<VersionInfo>> => {
    const info = await this.service.getVersionInfo();
    return success(info);
  };
}

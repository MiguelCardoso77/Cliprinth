import { failure, Result, success } from "../utils/response";
import { isPlatform, LinkedAccountSummary, Platform } from "@/lib/accounts";
import { AccountsService } from "./service";

export class AccountsController {
  private service = new AccountsService();

  public handleList = async (): Promise<Result<LinkedAccountSummary[]>> => {
    const accounts = await this.service.list();
    return success(accounts);
  };

  public handleConfig = async (): Promise<Result<Record<Platform, boolean>>> => {
    return success(this.service.configured());
  };

  public handleUnlink = async (platform: string): Promise<Result<null>> => {
    if (!isPlatform(platform)) {
      return failure("Unknown platform", 400);
    }

    await this.service.unlink(platform);
    return success(null);
  };
}

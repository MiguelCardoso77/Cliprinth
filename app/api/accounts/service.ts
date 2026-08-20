import {
  listAccounts,
  LinkedAccountSummary,
  Platform,
  PLATFORMS,
  removeAccount,
  toSummary,
} from "@/lib/accounts";
import { getProvider } from "@/lib/oauth";

export class AccountsService {
  public list = async (): Promise<LinkedAccountSummary[]> => {
    const accounts = await listAccounts();
    return accounts.map(toSummary);
  };

  public unlink = async (platform: Platform): Promise<void> => {
    await removeAccount(platform);
  };

  // Which platforms have API credentials set (GOOGLE_CLIENT_ID, etc.) — the
  // client uses this to disable "Link Account" instead of sending the user
  // through a connect flow that can only fail.
  public configured = (): Record<Platform, boolean> => {
    return Object.fromEntries(
      PLATFORMS.map((platform) => [platform, getProvider(platform).isConfigured()]),
    ) as Record<Platform, boolean>;
  };
}

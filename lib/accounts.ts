import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const ACCOUNTS_FILE = path.join(process.cwd(), "storage", "accounts.json");

export type Platform = "youtube" | "tiktok" | "instagram";

export const PLATFORMS: Platform[] = ["youtube", "tiktok", "instagram"];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as string[]).includes(value);
}

// A linked account holds the OAuth tokens needed to post on the user's
// behalf via each platform's official posting API (see CLAUDE.md § step 7).
// Tokens never leave the server — LinkedAccountSummary is the only shape
// exposed to the client.
export type LinkedAccount = {
  platform: Platform;
  accountId: string;
  displayName: string;
  accessToken: string;
  refreshToken?: string;
  // ISO timestamp the access token expires at, if the provider says.
  expiresAt?: string;
  connectedAt: string;
};

export type LinkedAccountSummary = Omit<
  LinkedAccount,
  "accessToken" | "refreshToken"
>;

export function toSummary(account: LinkedAccount): LinkedAccountSummary {
  const { platform, accountId, displayName, expiresAt, connectedAt } = account;
  return { platform, accountId, displayName, expiresAt, connectedAt };
}

async function readAccounts(): Promise<LinkedAccount[]> {
  try {
    const raw = await readFile(ACCOUNTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: LinkedAccount[]): Promise<void> {
  await mkdir(path.dirname(ACCOUNTS_FILE), { recursive: true });
  await writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

export async function listAccounts(): Promise<LinkedAccount[]> {
  return readAccounts();
}

export async function getAccount(
  platform: Platform,
): Promise<LinkedAccount | null> {
  const accounts = await readAccounts();
  return accounts.find((a) => a.platform === platform) ?? null;
}

// One linked account per platform — connecting a new one replaces the old.
export async function saveAccount(
  account: Omit<LinkedAccount, "connectedAt">,
): Promise<LinkedAccount> {
  const accounts = await readAccounts();
  const entry: LinkedAccount = { ...account, connectedAt: new Date().toISOString() };
  await writeAccounts([
    ...accounts.filter((a) => a.platform !== account.platform),
    entry,
  ]);
  return entry;
}

export async function removeAccount(platform: Platform): Promise<void> {
  const accounts = await readAccounts();
  await writeAccounts(accounts.filter((a) => a.platform !== platform));
}

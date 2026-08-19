import packageJson from "@/package.json";

const REMOTE_PACKAGE_JSON_URL =
  "https://raw.githubusercontent.com/MiguelCardoso77/Cliprinth/master/package.json";

export type VersionInfo = {
  current: string;
  latest: string | null;
  upToDate: boolean | null;
};

export class VersionService {
  public getVersionInfo = async (): Promise<VersionInfo> => {
    const current = packageJson.version;
    const latest = await this.fetchRemoteVersion();

    return {
      current,
      latest,
      upToDate: latest === null ? null : latest === current,
    };
  };

  private fetchRemoteVersion = async (): Promise<string | null> => {
    try {
      const res = await fetch(REMOTE_PACKAGE_JSON_URL, { cache: "no-store" });
      if (!res.ok) return null;

      const remote = (await res.json()) as { version?: unknown };
      return typeof remote.version === "string" ? remote.version : null;
    } catch {
      return null;
    }
  };
}

export const versionService = new VersionService();

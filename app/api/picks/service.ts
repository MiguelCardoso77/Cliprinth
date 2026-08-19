import { listShortlist, pickClip, ShortlistEntry } from "@/lib/storage";

export class PicksService {
  public listShortlist = (): Promise<ShortlistEntry[]> => {
    return listShortlist();
  };

  public pickClip = (projectId: string, momentIndex: number): Promise<ShortlistEntry> => {
    return pickClip(projectId, momentIndex);
  };
}

export const picksService = new PicksService();

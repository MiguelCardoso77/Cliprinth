export type JobStatus = "pending" | "processing" | "done" | "error";

export type Job<T> = {
  status: JobStatus;
  result?: T;
  error?: string;
};

export class JobStore<T> {
  private jobs = new Map<string, Job<T>>();

  public create = (id: string) => {
    this.jobs.set(id, { status: "pending" });
  };

  public update = (id: string, patch: Partial<Job<T>>) => {
    const job = this.jobs.get(id);
    if (!job) return;
    this.jobs.set(id, { ...job, ...patch });
  };

  public get = (id: string) => {
    return this.jobs.get(id);
  };
}

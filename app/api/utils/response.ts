export type Success<T> = { data: T; status: number };
export type Failure = { error: string; status: number };
export type Result<T> = Success<T> | Failure;

export function success<T>(data: T, status = 200): Success<T> {
  return { data, status };
}

export function failure(error: string, status = 400): Failure {
  return { error, status };
}

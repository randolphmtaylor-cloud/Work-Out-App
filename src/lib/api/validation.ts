import { ZodError } from "zod";

export type ValidationIssue = {
  path: string;
  message: string;
};

export function validationIssues(error: unknown): ValidationIssue[] {
  if (!(error instanceof ZodError)) {
    return [];
  }

  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "request",
    message: issue.message,
  }));
}


import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { ConsortApi } from "./types";

const useMock = (import.meta.env["VITE_USE_MOCK"] as string | undefined) !== "false";

export const api: ConsortApi = useMock ? mockApi : httpApi;
export * from "./types";

import { describe, expect, it } from "vitest";
import {
  isPublicShareRateLimited,
  SHARE_RATE_MAX_REQUESTS,
  SHARE_RATE_WINDOW_MS,
} from "@/features/sharing/application/share-rate-limit";

describe("share-rate-limit", () => {
  it("libera até o limite dentro da janela", () => {
    const ip = "rate-test-1";
    for (let i = 0; i < SHARE_RATE_MAX_REQUESTS; i++) {
      expect(isPublicShareRateLimited(ip, 1_000 + i)).toBe(false);
    }
    expect(isPublicShareRateLimited(ip, 2_000)).toBe(true);
  });

  it("volta a liberar após a janela", () => {
    const ip = "rate-test-2";
    for (let i = 0; i < SHARE_RATE_MAX_REQUESTS; i++) {
      isPublicShareRateLimited(ip, 0);
    }
    expect(isPublicShareRateLimited(ip, 0)).toBe(true);
    expect(isPublicShareRateLimited(ip, SHARE_RATE_WINDOW_MS + 1)).toBe(false);
  });

  it("controla cada IP de forma independente", () => {
    for (let i = 0; i < SHARE_RATE_MAX_REQUESTS; i++) {
      isPublicShareRateLimited("rate-test-3", 0);
    }
    expect(isPublicShareRateLimited("rate-test-3", 0)).toBe(true);
    expect(isPublicShareRateLimited("rate-test-4", 0)).toBe(false);
  });
});

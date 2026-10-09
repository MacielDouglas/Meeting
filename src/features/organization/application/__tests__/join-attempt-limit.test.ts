import { describe, expect, it } from "vitest";
import {
  isJoinRedeemBlocked,
  JOIN_REDEEM_MAX_FAILURES,
  registerJoinRedeemFailure,
  resetJoinRedeemAttempts,
} from "@/features/organization/application/join-attempt-limit";

describe("join-attempt-limit", () => {
  it("libera antes do limite", () => {
    resetJoinRedeemAttempts();
    for (let i = 0; i < JOIN_REDEEM_MAX_FAILURES - 1; i++) {
      registerJoinRedeemFailure("u1", "ABC-DEF-GHJ");
    }
    expect(isJoinRedeemBlocked("u1", "ABC-DEF-GHJ")).toBe(false);
  });

  it("bloqueia no limite e isola por conta e código", () => {
    resetJoinRedeemAttempts();
    for (let i = 0; i < JOIN_REDEEM_MAX_FAILURES; i++) {
      registerJoinRedeemFailure("u1", "ABC-DEF-GHJ");
    }
    expect(isJoinRedeemBlocked("u1", "ABC-DEF-GHJ")).toBe(true);
    expect(isJoinRedeemBlocked("u2", "ABC-DEF-GHJ")).toBe(false);
    expect(isJoinRedeemBlocked("u1", "XXX-XXX-XXX")).toBe(false);
  });

  it("a janela expira com o tempo", () => {
    resetJoinRedeemAttempts();
    const now = Date.now();
    for (let i = 0; i < JOIN_REDEEM_MAX_FAILURES; i++) {
      registerJoinRedeemFailure("u1", "ABC-DEF-GHJ", now);
    }
    expect(isJoinRedeemBlocked("u1", "ABC-DEF-GHJ", now)).toBe(true);
    expect(isJoinRedeemBlocked("u1", "ABC-DEF-GHJ", now + 11 * 60 * 1000)).toBe(false);
  });
});

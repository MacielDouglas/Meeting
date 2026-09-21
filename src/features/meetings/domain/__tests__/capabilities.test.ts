import { describe, expect, it } from "vitest";
import {
  capabilityField,
  helperCapabilityField,
  helperRuleFor,
  isEligibleHelper,
} from "@/features/meetings/domain/capabilities";

describe("capabilityField", () => {
  it("filtra a oração inicial do fim de semana por publicChairman", () => {
    expect(capabilityField("weekendOpening")).toBe("publicChairman");
  });

  it("mapeia presidente e partes do meio de semana", () => {
    expect(capabilityField("president")).toBe("midweekChairman");
    expect(capabilityField("ministry")).toBeNull();
    expect(capabilityField("prayer")).toBe("prayer");
  });

  it("mapeia ajudantes", () => {
    expect(helperCapabilityField("ministry")).toBe("helper");
    expect(helperCapabilityField("ministryStart")).toBe("helper");
    expect(helperCapabilityField("ministryReturn")).toBe("helper");
    expect(helperCapabilityField("ministryDisciples")).toBe("helper");
    expect(helperCapabilityField("ministryExplainStaging")).toBe("helper");
    expect(helperCapabilityField("ministrySpeech")).toBeNull();
    expect(helperCapabilityField("ministryElder")).toBeNull();
    expect(helperCapabilityField("watchtowerStudy")).toBe("watchtowerReader");
    expect(helperCapabilityField("treasuresTalk")).toBeNull();
  });

  it("mapeia o titular de cada parte do ministério", () => {
    expect(capabilityField("ministryStart")).toBe("startConversations");
    expect(capabilityField("ministryReturn")).toBe("returnVisits");
    expect(capabilityField("ministryDisciples")).toBe("makeDisciples");
    expect(capabilityField("ministryExplainStaging")).toBe("explainBeliefs");
    expect(capabilityField("ministrySpeech")).toBe("betterSpeech");
    expect(capabilityField("ministryElder")).toBe("elderOrServant");
  });

  it("define a regra do ajudante por parte", () => {
    expect(helperRuleFor("ministryStart")).toBe("sameSexOrFamily");
    expect(helperRuleFor("ministryExplainStaging")).toBe("sameSexOrFamily");
    expect(helperRuleFor("ministryReturn")).toBe("sameSex");
    expect(helperRuleFor("ministryDisciples")).toBe("sameSex");
    expect(helperRuleFor("ministrySpeech")).toBeNull();
    expect(helperRuleFor("ministryElder")).toBeNull();
    expect(helperRuleFor("living")).toBeNull();
  });

  it("filtra o ajudante por sexo e família", () => {
    const titular = { id: "t1", sex: "male" as const, familyGroupId: "f1" };
    const sameSex = { id: "h1", sex: "male" as const, familyGroupId: "f2" };
    const familyOnly = { id: "h2", sex: "female" as const, familyGroupId: "f1" };
    const stranger = { id: "h3", sex: "female" as const, familyGroupId: "f9" };
    const self = { id: "t1", sex: "male" as const, familyGroupId: "f1" };
    expect(isEligibleHelper(titular, sameSex, "sameSex")).toBe(true);
    expect(isEligibleHelper(titular, familyOnly, "sameSex")).toBe(false);
    expect(isEligibleHelper(titular, sameSex, "sameSexOrFamily")).toBe(true);
    expect(isEligibleHelper(titular, familyOnly, "sameSexOrFamily")).toBe(true);
    expect(isEligibleHelper(titular, stranger, "sameSexOrFamily")).toBe(false);
    expect(isEligibleHelper(titular, self, "sameSexOrFamily")).toBe(false);
    expect(
      isEligibleHelper(
        { id: "t2", sex: "female" as const, familyGroupId: null },
        stranger,
        "sameSexOrFamily",
      ),
    ).toBe(true);
    expect(
      isEligibleHelper(
        { id: "t2", sex: "female" as const, familyGroupId: null },
        { id: "h4", sex: "male" as const, familyGroupId: null },
        "sameSexOrFamily",
      ),
    ).toBe(false);
  });
});

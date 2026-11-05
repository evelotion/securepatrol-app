import { describe, expect, it } from "vitest";

import { userDalamScope, whereUserDalamScope } from "./scope";

const danruA = { id: "d1", role: "DANRU", regu: "Regu A" } as const;

describe("whereUserDalamScope", () => {
  it("Super Admin dan Chief melihat semua regu", () => {
    expect(
      whereUserDalamScope({ id: "a", role: "SUPER_ADMIN", regu: null }),
    ).toEqual({});
    expect(
      whereUserDalamScope({ id: "c", role: "CHIEF_SECURITY", regu: "Regu B" }),
    ).toEqual({});
  });

  it("Danru dibatasi ke regunya", () => {
    expect(whereUserDalamScope(danruA)).toEqual({ regu: "Regu A" });
  });

  it("Danru tanpa regu dan Security hanya melihat dirinya sendiri", () => {
    expect(
      whereUserDalamScope({ id: "d2", role: "DANRU", regu: null }),
    ).toEqual({ id: "d2" });
    expect(
      whereUserDalamScope({ id: "s1", role: "SECURITY", regu: "Regu A" }),
    ).toEqual({ id: "s1" });
  });
});

describe("userDalamScope", () => {
  it("Danru Regu A tidak boleh menjangkau Regu B", () => {
    expect(userDalamScope(danruA, { id: "s1", regu: "Regu A" })).toBe(true);
    expect(userDalamScope(danruA, { id: "s2", regu: "Regu B" })).toBe(false);
    expect(userDalamScope(danruA, { id: "s3", regu: null })).toBe(false);
  });

  it("Chief menjangkau semua, Security hanya dirinya", () => {
    const chief = { id: "c", role: "CHIEF_SECURITY", regu: null } as const;
    expect(userDalamScope(chief, { id: "x", regu: "Regu Z" })).toBe(true);
    const sec = { id: "s1", role: "SECURITY", regu: "Regu A" } as const;
    expect(userDalamScope(sec, { id: "s1", regu: "Regu A" })).toBe(true);
    expect(userDalamScope(sec, { id: "s9", regu: "Regu A" })).toBe(false);
  });
});

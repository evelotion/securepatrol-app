import { describe, expect, it } from "vitest";

import { diffAudit } from "./audit-diff";

describe("diffAudit", () => {
  it("hanya mengembalikan field yang berubah", () => {
    expect(
      diffAudit({ nama: "A", aktif: true, regu: "X" }, { nama: "B", aktif: true, regu: "X" }),
    ).toEqual([{ field: "nama", lama: "A", baru: "B" }]);
  });

  it("field yang hanya ada di satu sisi tampil dengan sisi lain null", () => {
    expect(diffAudit(undefined, { id: "1" })).toEqual([
      { field: "id", lama: null, baru: "1" },
    ]);
    expect(diffAudit({ id: "1" }, null)).toEqual([
      { field: "id", lama: "1", baru: null },
    ]);
  });

  it("membedakan null JSON dari field yang tidak ada", () => {
    expect(diffAudit({ x: null }, {})).toEqual([
      { field: "x", lama: "null", baru: null },
    ]);
  });

  it("membandingkan nilai bersarang dan array", () => {
    expect(diffAudit({ p: { a: 1 }, l: [1] }, { p: { a: 2 }, l: [1] })).toEqual([
      { field: "p", lama: '{"a":1}', baru: '{"a":2}' },
    ]);
  });

  it("kosong bila sama atau keduanya kosong", () => {
    expect(diffAudit({ a: 1 }, { a: 1 })).toEqual([]);
    expect(diffAudit(null, null)).toEqual([]);
  });
});

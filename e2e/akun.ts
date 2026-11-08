import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type AkunUji = {
  email: string;
  password: string;
  nama: string;
};

const DAFTAR = {
  secA: { email: "uji.sec.a@uji.test", nama: "Uji Security A", env: "E2E_PASSWORD_SEC_A" },
  danruA: { email: "uji.danru.a@uji.test", nama: "Uji Danru A", env: "E2E_PASSWORD_DANRU_A" },
  chief: { email: "uji.chief@uji.test", nama: "Uji Chief", env: "E2E_PASSWORD_CHIEF" },
} as const;

/** Password dari env, atau dari .tmp-uji/akun.txt (lokal, tidak di-commit). */
function bacaBerkas(): Map<string, string> {
  const peta = new Map<string, string>();
  const jalur = resolve(process.cwd(), ".tmp-uji", "akun.txt");
  if (!existsSync(jalur)) return peta;
  for (const baris of readFileSync(jalur, "utf8").split(/\r?\n/)) {
    if (!baris || baris.startsWith("#")) continue;
    const [email, password] = baris.split("\t");
    if (email && password) peta.set(email.trim(), password.trim());
  }
  return peta;
}

export function akun(kunci: keyof typeof DAFTAR): AkunUji {
  const def = DAFTAR[kunci];
  const password = process.env[def.env] ?? bacaBerkas().get(def.email);
  if (!password) {
    throw new Error(
      `Password ${def.email} tidak ditemukan. Set ${def.env} atau sediakan .tmp-uji/akun.txt.`,
    );
  }
  return { email: def.email, password, nama: def.nama };
}

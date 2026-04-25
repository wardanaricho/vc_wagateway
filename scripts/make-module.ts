// scripts/make-module.ts
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const moduleName = process.argv[2];

if (!moduleName) {
  console.error(
    "❌ Nama modul wajib diisi. Contoh: tsx scripts/make-module.ts webhook",
  );
  process.exit(1);
}

// Validasi: hanya huruf kecil, angka, dan dash. Tidak boleh diawali/diakhiri dash.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(moduleName)) {
  console.error(
    `❌ Nama modul tidak valid: '${moduleName}'.\n` +
      `   Gunakan kebab-case lowercase, contoh: 'webhook', 'user-profile', 'api-key'.`,
  );
  process.exit(1);
}

const moduleDir = join("src", "modules", moduleName);

if (existsSync(moduleDir)) {
  console.error(`❌ Modul '${moduleName}' sudah ada di ${moduleDir}`);
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────
const toPascal = (s: string) =>
  s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

const toCamel = (s: string) =>
  s
    .split("-")
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");

// Pluralization sederhana untuk route path & variable name
const pluralize = (s: string): string => {
  if (/(s|x|z|ch|sh)$/.test(s)) return `${s}es`;
  if (/[^aeiou]y$/.test(s)) return `${s.slice(0, -1)}ies`;
  return `${s}s`;
};

const pascal = toPascal(moduleName);
const camel = toCamel(moduleName);
const routePath = pluralize(moduleName);

// ── File templates ───────────────────────────────────────────────────────
const files: Record<string, string> = {
  // types
  [`${moduleName}.types.ts`]: `export interface Create${pascal}Body {
  // TODO: tambahkan field
}

export interface Update${pascal}Body {
  // TODO: tambahkan field
}
`,

  // service
  [`${moduleName}.service.ts`]: `import { prisma } from "../../../lib/prisma.js";
import type { Create${pascal}Body, Update${pascal}Body } from "./${moduleName}.types.js";

export async function create${pascal}(userId: string, body: Create${pascal}Body): Promise<unknown> {
  // TODO: implementasi
  throw new Error("create${pascal} belum diimplementasikan");
}

export async function get${pascal}sByUser(userId: string): Promise<unknown[]> {
  // TODO: implementasi
  return [];
}

export async function get${pascal}ById(id: string, userId: string): Promise<unknown> {
  // TODO: implementasi
  throw new Error("get${pascal}ById belum diimplementasikan");
}

export async function update${pascal}(
  id: string,
  userId: string,
  body: Update${pascal}Body,
): Promise<unknown> {
  // TODO: implementasi
  throw new Error("update${pascal} belum diimplementasikan");
}

export async function delete${pascal}(id: string, userId: string): Promise<void> {
  // TODO: implementasi
  throw new Error("delete${pascal} belum diimplementasikan");
}
`,

  // controller
  [`${moduleName}.controller.ts`]: `import type { Request, Response } from "express";
import {
  create${pascal},
  get${pascal}sByUser,
  get${pascal}ById,
  update${pascal},
  delete${pascal},
} from "./${moduleName}.service.js";
import type { Create${pascal}Body, Update${pascal}Body } from "./${moduleName}.types.js";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export async function create(req: Request, res: Response) {
  const userId = req.user!.sub;
  const body = req.body as Create${pascal}Body;

  try {
    const data = await create${pascal}(userId, body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: errorMessage(err, "Gagal membuat ${moduleName}") });
  }
}

export async function index(req: Request, res: Response) {
  const userId = req.user!.sub;

  try {
    const data = await get${pascal}sByUser(userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: errorMessage(err, "Gagal mengambil daftar ${moduleName}") });
  }
}

export async function show(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    const data = await get${pascal}ById(id, userId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: errorMessage(err, "Gagal mengambil ${moduleName}") });
  }
}

export async function update(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;
  const body = req.body as Update${pascal}Body;

  try {
    const data = await update${pascal}(id, userId, body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: errorMessage(err, "Gagal update ${moduleName}") });
  }
}

export async function destroy(req: Request, res: Response) {
  const userId = req.user!.sub;
  const id = req.params["id"] as string;

  try {
    await delete${pascal}(id, userId);
    res.status(200).json({ success: true, message: "${pascal} berhasil dihapus" });
  } catch (err) {
    res.status(404).json({ success: false, message: errorMessage(err, "Gagal menghapus ${moduleName}") });
  }
}
`,

  // routes
  [`${moduleName}.routes.ts`]: `import { Router } from "express";
import { create, index, show, update, destroy } from "./${moduleName}.controller.js";
import { authenticate } from "../auth/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", index);
router.post("/", create);
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", destroy);

export { router as ${camel}Router };
`,
};

// ── Write files ──────────────────────────────────────────────────────────
try {
  mkdirSync(moduleDir, { recursive: true });

  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(moduleDir, filename), content);
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`❌ Gagal menulis file: ${msg}`);
  process.exit(1);
}

// ── Feedback ─────────────────────────────────────────────────────────────
console.log(`✅ Modul '${moduleName}' berhasil dibuat:`);
for (const filename of Object.keys(files)) {
  console.log(`   src/modules/${moduleName}/${filename}`);
}

// Warning jika auth middleware belum ada
const authMiddlewarePath = join("src", "modules", "auth", "auth.middleware.ts");
if (!existsSync(authMiddlewarePath)) {
  console.warn(
    `\n⚠️  Peringatan: '${authMiddlewarePath}' tidak ditemukan.\n` +
      `   Pastikan modul 'auth' sudah ada, atau hapus/ganti import 'authenticate' di ${moduleName}.routes.ts`,
  );
}

console.log(`\n📌 Jangan lupa daftarkan router di src/app.ts:`);
console.log(
  `   import { ${camel}Router } from "./modules/${moduleName}/${moduleName}.routes.js";`,
);
console.log(`   app.use("/api/${routePath}", ${camel}Router);`);

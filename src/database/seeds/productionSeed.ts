/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  CareOS Hospital – Production Seed Script                               │
 * │  File: src/database/seeds/productionSeed.ts                             │
 * │                                                                         │
 * │  SAFE TO RE-RUN (idempotent):                                           │
 * │    • All inserts use ON CONFLICT … DO UPDATE so re-running never        │
 * │      fails on duplicate-key violations.                                  │
 * │    • No data is deleted or truncated.                                   │
 * │                                                                         │
 * │  What this seeds:                                                       │
 * │    1. Primary admin account   (abodydade40@gmail.com)                  │
 * │    2. Core hospital departments (9 specialties)                         │
 * │                                                                         │
 * │  What this does NOT seed:                                               │
 * │    ✗ Dummy patients, fake appointments, or mock medical history         │
 * │                                                                         │
 * │  Run once on first deploy or after a volume reset:                      │
 * │    npm run seed:prod                                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import bcrypt from 'bcrypt';
import db from '../../config/db';
import { UserRole } from '../../modules/users/user.types';

// ─── ANSI colour helpers (no extra deps) ─────────────────────────────────────
const clr = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  grey:   '\x1b[90m',
};

const log = {
  info:    (msg: string) => console.log(`${clr.cyan}ℹ${clr.reset}  ${msg}`),
  success: (msg: string) => console.log(`${clr.green}✔${clr.reset}  ${msg}`),
  warn:    (msg: string) => console.log(`${clr.yellow}⚠${clr.reset}  ${msg}`),
  error:   (msg: string) => console.error(`${clr.red}✖${clr.reset}  ${msg}`),
  section: (msg: string) => console.log(`\n${clr.bold}${clr.cyan}══ ${msg} ══${clr.reset}`),
  divider: ()            => console.log(`${clr.grey}${'─'.repeat(60)}${clr.reset}`),
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartmentRow {
  name:        string;
  code:        string;
  name_en:     string;
  name_ar:     string;
  description: string;
}

// ─── Master Data ──────────────────────────────────────────────────────────────

/** Core hospital departments — production data only, no dummy entries. */
const DEPARTMENTS: DepartmentRow[] = [
  {
    name:        'General Practice',
    code:        'GENP',
    name_en:     'General Practice',
    name_ar:     'الممارسة العامة',
    description: 'Primary care and routine health consultations',
  },
  {
    name:        'Cardiology',
    code:        'CARD',
    name_en:     'Cardiology',
    name_ar:     'طب القلب',
    description: 'Heart and cardiovascular disease specialists',
  },
  {
    name:        'Pediatrics',
    code:        'PEDS',
    name_en:     'Pediatrics',
    name_ar:     'طب الأطفال',
    description: 'Medical care for infants, children, and adolescents',
  },
  {
    name:        'Emergency Medicine',
    code:        'EMER',
    name_en:     'Emergency Medicine',
    name_ar:     'طب الطوارئ',
    description: 'Immediate treatment for acute illnesses and injuries',
  },
  {
    name:        'Orthopedics',
    code:        'ORTH',
    name_en:     'Orthopedics',
    name_ar:     'جراحة العظام',
    description: 'Bones, joints, muscles, ligaments, and tendons',
  },
  {
    name:        'Neurology',
    code:        'NEUR',
    name_en:     'Neurology',
    name_ar:     'طب الأعصاب',
    description: 'Brain, spinal cord, and nervous system disorders',
  },
  {
    name:        'Gynecology & Obstetrics',
    code:        'GYOB',
    name_en:     'Gynecology & Obstetrics',
    name_ar:     'أمراض النساء والتوليد',
    description: 'Women\'s reproductive health and maternity care',
  },
  {
    name:        'Dermatology',
    code:        'DERM',
    name_en:     'Dermatology',
    name_ar:     'طب الجلد',
    description: 'Skin, hair, and nail conditions',
  },
  {
    name:        'Radiology & Imaging',
    code:        'RADI',
    name_en:     'Radiology & Imaging',
    name_ar:     'الأشعة والتصوير الطبي',
    description: 'Medical imaging and diagnostic radiology services',
  },
];

// ─── Admin account ────────────────────────────────────────────────────────────

const ADMIN = {
  full_name: 'Abody System Admin',
  email:     'abodydade40@gmail.com',
  password:  'BOODa2007#',          // hashed before insertion — never stored raw
  phone:     '+20000000000',         // placeholder; update via profile settings
  role:      UserRole.ADMIN,
};

// ─── Seeder ───────────────────────────────────────────────────────────────────

async function seedDepartments(): Promise<void> {
  log.section('Step 1 — Core Departments');

  let created = 0;
  let updated = 0;

  for (const dept of DEPARTMENTS) {
    // xmax = 0 → new row was inserted; xmax > 0 → existing row was updated
    const result = await db.raw<{ rows: { id: number; name: string; inserted: boolean }[] }>(
      `INSERT INTO departments (name, code, name_en, name_ar, description)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (code) DO UPDATE
         SET name        = EXCLUDED.name,
             name_en     = EXCLUDED.name_en,
             name_ar     = EXCLUDED.name_ar,
             description = EXCLUDED.description,
             updated_at  = NOW()
       RETURNING id, name,
         (xmax = 0) AS inserted`,
      [dept.name, dept.code, dept.name_en, dept.name_ar, dept.description],
    );

    const row = result.rows[0];
    if ((row as any).inserted) {
      created++;
      log.success(`  Created dept [${dept.code}] ${dept.name_en}`);
    } else {
      updated++;
      log.info(`  Updated dept [${dept.code}] ${dept.name_en} (already existed)`);
    }
  }

  log.divider();
  log.success(`Departments: ${created} created, ${updated} updated  (${DEPARTMENTS.length} total)`);
}

async function seedAdmin(): Promise<void> {
  log.section('Step 2 — Primary Admin Account');

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  log.info(`Hashing admin password (bcrypt, ${saltRounds} rounds)…`);

  const password_hash = await bcrypt.hash(ADMIN.password, saltRounds);

  // xmax = 0 → new row was inserted; xmax > 0 → existing row was updated
  const result = await db.raw<{ rows: { id: number; email: string; inserted: boolean }[] }>(
    `INSERT INTO users
       (full_name, email, password_hash, role, phone, is_active, is_verified)
     VALUES (?, ?, ?, ?, ?, true, true)
     ON CONFLICT (email) DO UPDATE
       SET full_name     = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           role          = EXCLUDED.role,
           is_active     = true,
           is_verified   = true,
     RETURNING id, email,
       (xmax = 0) AS inserted`,
    [ADMIN.full_name, ADMIN.email, password_hash, ADMIN.role, ADMIN.phone],
  );

  const row = result.rows[0];
  const action = (row as any).inserted ? 'Created' : 'Updated (already existed)';

  log.divider();
  log.success(`Admin account: ${action}`);
  console.log(`
  ${clr.bold}Admin Credentials${clr.reset}
  ${clr.grey}─────────────────────────────────────────${clr.reset}
  Email    : ${clr.cyan}${ADMIN.email}${clr.reset}
  Role     : ${clr.yellow}${ADMIN.role.toUpperCase()}${clr.reset}
  Verified : ${clr.green}true${clr.reset}
  Active   : ${clr.green}true${clr.reset}
  ${clr.grey}─────────────────────────────────────────${clr.reset}
  ${clr.yellow}⚠  Keep the admin password secret.${clr.reset}
  ${clr.yellow}   Change it immediately after first login.${clr.reset}
`);
}

// ─── Entry-point ──────────────────────────────────────────────────────────────

async function runProductionSeed(): Promise<void> {
  console.log(`
${clr.bold}${clr.cyan}╔═══════════════════════════════════════════════════════════╗
║         CareOS — Production Database Seed                 ║
╚═══════════════════════════════════════════════════════════╝${clr.reset}
`);

  const env = process.env.NODE_ENV ?? 'development';
  log.info(`Environment : ${clr.bold}${env}${clr.reset}`);
  log.info(`Database    : ${clr.bold}${process.env.DB_NAME ?? process.env.DATABASE_URL?.split('/').pop() ?? '(from DATABASE_URL)'}${clr.reset}`);
  log.info(`Timestamp   : ${new Date().toISOString()}`);

  if (env === 'production') {
    log.warn('Running against PRODUCTION database — seed is idempotent, existing data is preserved.');
  }

  try {
    await seedDepartments();
    await seedAdmin();

    console.log(`
${clr.bold}${clr.green}╔═══════════════════════════════════════════════════════════╗
║         ✅  Production seed completed successfully         ║
╚═══════════════════════════════════════════════════════════╝${clr.reset}
`);
  } catch (err: any) {
    log.error(`Seed failed: ${err?.message ?? err}`);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Only auto-run when invoked directly (ts-node src/database/seeds/productionSeed.ts)
if (require.main === module) {
  runProductionSeed().then(() => process.exit(0));
}

export { runProductionSeed };

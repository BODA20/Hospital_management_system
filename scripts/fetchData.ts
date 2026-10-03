import db from '../src/config/db';

async function run() {
  console.log('--- ALL APPOINTMENTS ---');
  const allAppts = await db.raw(`
    SELECT a.id, a.doctor_id, a.patient_id, a.status, a.queue_status, a.booking_source, a.appointment_date, a.starts_at, a.ends_at,
           d.id AS existing_doctor_id, d.user_id AS doctor_user_id, u.id AS user_id, u.full_name, u.email, u.role
    FROM appointments a LEFT JOIN doctors d ON d.id = a.doctor_id LEFT JOIN users u ON u.id = d.user_id ORDER BY a.id;
  `);
  console.table(allAppts.rows);
  console.log('\n--- DOCTOR 1 APPOINTMENTS ---');
  console.table(allAppts.rows.filter((r: any) => r.doctor_id === 1));

  console.log('\n--- DOCTOR 1 ---');
  const doc1 = await db('doctors').where({ id: 1 });
  console.table(doc1);

  console.log('\n--- ADMIN USER ---');
  const admin = await db('users')
    .where('full_name', 'Abody System Admin')
    .orWhere('email', 'abodydade40@gmail.com')
    .select('id', 'full_name', 'email', 'role', 'is_active');
  console.table(admin);

  console.log('\n--- CURRENT TIME ---');
  const time = await db.raw("SELECT NOW(), NOW() AT TIME ZONE 'Africa/Cairo' as cairo_time");
  console.table(time.rows);
}

run().then(()=>db.destroy());

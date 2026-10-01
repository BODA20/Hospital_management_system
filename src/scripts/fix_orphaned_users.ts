import db from '../config/db';

async function fixOrphanedUsers() {
  console.log('Starting DB relational injection...');
  try {
    const firstDept = await db('departments').first();
    if (!firstDept) {
      console.log('No departments found! We will use null or insert a dummy one.');
    }
    const deptId1 = firstDept ? firstDept.id : 1;
    const secondDept = await db('departments').whereNot('id', deptId1).first();
    const deptId2 = secondDept ? secondDept.id : deptId1;

    console.log(`Using Department IDs: ${deptId1} (for Doctors) and ${deptId2} (for Nurses)`);

    const allUsers = await db('users').select('id', 'role');
    for (const u of allUsers) {
      const role = u.role ? u.role.toLowerCase() : '';
      if (role === 'doctor') {
        const doc = await db('doctors').where({ user_id: u.id }).first();
        if (!doc) {
          console.log(`[SWEEP] Injecting doctor record for user_id: ${u.id}`);
          await db('doctors').insert({ user_id: u.id, department_id: deptId1 });
        } else if (!doc.department_id) {
          console.log(`[SWEEP] Updating department for doctor user_id: ${u.id}`);
          await db('doctors').where({ user_id: u.id }).update({ department_id: deptId1 });
        }
      } else if (role === 'nurse') {
        const nurse = await db('nurses').where({ user_id: u.id }).first();
        if (!nurse) {
          console.log(`[SWEEP] Injecting nurse record for user_id: ${u.id}`);
          await db('nurses').insert({ user_id: u.id, department_id: deptId2 });
        } else if (!nurse.department_id) {
          console.log(`[SWEEP] Updating department for nurse user_id: ${u.id}`);
          await db('nurses').where({ user_id: u.id }).update({ department_id: deptId2 });
        }
      }
    }
    console.log('✅ DB relational injection completed successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fixOrphanedUsers();

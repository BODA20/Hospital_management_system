import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Find the admin user
  const admin = await knex('users').where({ email: 'abodydade40@gmail.com' }).first();
  if (admin) {
    // Check if there is a doctor profile for the admin
    const doctorProfile = await knex('doctors').where({ user_id: admin.id }).first();
    
    if (doctorProfile) {
      // Check for appointments
      const appointments = await knex('appointments').where({ doctor_id: doctorProfile.id });
      if (appointments.length === 0) {
        // Safe to remove the bad doctor row
        await knex('doctors').where({ id: doctorProfile.id }).delete();
        console.log(`Removed bad doctor profile (ID: ${doctorProfile.id}) for admin ${admin.email}`);
      } else {
        console.warn(`Could not remove doctor profile (ID: ${doctorProfile.id}) for admin ${admin.email} because it has ${appointments.length} appointments.`);
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Cannot reliably reverse this, as we don't know the exact department/specialization it had
}

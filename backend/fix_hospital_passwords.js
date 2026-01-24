const { HospitalUser } = require('./dist/modules/hospital/models/User');
const { connectDB } = require('./dist/config/db');

async function fixHospitalPasswords() {
  await connectDB();
  const users = await HospitalUser.find({});
  
  console.log('FIXING HOSPITAL USER PASSWORDS (removing bcrypt hash, using plain text)');
  
  for (const u of users) {
    await HospitalUser.updateOne(
      { _id: u._id },
      { $set: { passwordHash: '123' } }
    );
    console.log(`Fixed password for: ${u.username} (${u.role})`);
  }
  
  console.log('\nAll hospital users can now login with password: 123 (plain text)');
  process.exit(0);
}

fixHospitalPasswords().catch(console.error);

const { HospitalUser } = require('./dist/modules/hospital/models/User');
const { connectDB } = require('./dist/config/db');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  await connectDB();
  const users = await HospitalUser.find({});
  
  console.log('RESETTING ALL HOSPITAL USER PASSWORDS TO "123"');
  
  for (const u of users) {
    const passwordHash = await bcrypt.hash('123', 10);
    await HospitalUser.updateOne(
      { _id: u._id },
      { $set: { passwordHash } }
    );
    console.log(`Updated password for: ${u.username} (${u.role})`);
  }
  
  console.log('\nAll hospital users can now login with password: 123');
  process.exit(0);
}

resetPasswords().catch(console.error);

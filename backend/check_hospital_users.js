const { HospitalUser } = require('./dist/modules/hospital/models/User');
const { connectDB } = require('./dist/config/db');

async function checkHospitalUsers() {
  await connectDB();
  const users = await HospitalUser.find({});
  console.log('HOSPITAL USERS WITH PASSWORDS:');
  for (const u of users) {
    console.log(`Username: ${u.username}, Role: ${u.role}, HasPasswordHash: ${!!u.passwordHash}`);
  }
  process.exit(0);
}

checkHospitalUsers().catch(console.error);

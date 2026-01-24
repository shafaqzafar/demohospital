const { LabUser } = require('./dist/modules/lab/models/User');
const { PharmacyUser } = require('./dist/modules/pharmacy/models/User');
const { AestheticUser } = require('./dist/modules/aesthetic/models/User');
const { DiagnosticUser } = require('./dist/modules/diagnostic/models/User');
const { HospitalUser } = require('./dist/modules/hospital/models/User');
const { connectDB } = require('./dist/config/db');

async function checkAllUsers() {
  await connectDB();
  
  const users = {
    lab: await LabUser.find({}),
    pharmacy: await PharmacyUser.find({}),
    aesthetic: await AestheticUser.find({}),
    diagnostic: await DiagnosticUser.find({}),
    hospital: await HospitalUser.find({})
  };
  
  Object.entries(users).forEach(([module, userList]) => {
    console.log(`\n=== ${module.toUpperCase()} USERS ===`);
    if (userList.length === 0) {
      console.log('No users found');
    } else {
      userList.forEach(u => {
        console.log(`Username: ${u.username}, Role: ${u.role}`);
      });
    }
  });
  
  process.exit(0);
}

checkAllUsers().catch(console.error);

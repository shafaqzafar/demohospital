const { LabUser } = require('./dist/modules/lab/models/User');
const { PharmacyUser } = require('./dist/modules/pharmacy/models/User');
const { AestheticUser } = require('./dist/modules/aesthetic/models/User');
const { DiagnosticUser } = require('./dist/modules/diagnostic/models/User');
const { HospitalUser } = require('./dist/modules/hospital/models/User');
const { connectDB } = require('./dist/config/db');
const bcrypt = require('bcryptjs');

async function testLogins() {
  await connectDB();
  
  const users = {
    lab: await LabUser.find({}),
    pharmacy: await PharmacyUser.find({}),
    aesthetic: await AestheticUser.find({}),
    diagnostic: await DiagnosticUser.find({}),
    hospital: await HospitalUser.find({})
  };
  
  console.log('\n=== TESTING LOGIN CREDENTIALS ===');
  console.log('Default password for all users is: 123\n');
  
  Object.entries(users).forEach(([module, userList]) => {
    console.log(`=== ${module.toUpperCase()} LOGIN TEST ===`);
    if (userList.length === 0) {
      console.log('No users found');
    } else {
      userList.forEach(async (u) => {
        const isValid = await bcrypt.compare('123', u.passwordHash);
        console.log(`Username: ${u.username}, Role: ${u.role}, Password "123" valid: ${isValid}`);
      });
    }
  });
  
  setTimeout(() => process.exit(0), 1000);
}

testLogins().catch(console.error);

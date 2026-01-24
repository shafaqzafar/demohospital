const { HospitalUser } = require('./dist/modules/hospital/models/User');
const { LabUser } = require('./dist/modules/lab/models/User');
const { PharmacyUser } = require('./dist/modules/pharmacy/models/User');
const { DiagnosticUser } = require('./dist/modules/diagnostic/models/User');
const { AestheticUser } = require('./dist/modules/aesthetic/models/User');
const { connectDB } = require('./dist/config/db');

async function createProductionUsers() {
  await connectDB();
  
  console.log('🔧 Creating production users...');
  
  // Hospital users
  const hospitalUsers = [
    { username: 'admin', role: 'Admin' },
    { username: 'finance', role: 'Finance' },
    { username: 'recep', role: 'Reception' },
    { username: 'umar', role: 'Doctor' },
    { username: 'ibad', role: 'Doctor' }
  ];
  
  for (const user of hospitalUsers) {
    const exists = await HospitalUser.findOne({ username: user.username });
    if (!exists) {
      await HospitalUser.create({
        username: user.username,
        role: user.role,
        passwordHash: '123',
        active: true
      });
      console.log(`✅ Created hospital user: ${user.username} (${user.role})`);
    } else {
      console.log(`ℹ️ Hospital user already exists: ${user.username}`);
    }
  }
  
  // Lab user
  const labExists = await LabUser.findOne({ username: 'lab' });
  if (!labExists) {
    await LabUser.create({
      username: 'lab',
      role: 'admin',
      passwordHash: '123'
    });
    console.log('✅ Created lab user: lab (admin)');
  } else {
    console.log('ℹ️ Lab user already exists: lab');
  }
  
  // Pharmacy user
  const pharmacyExists = await PharmacyUser.findOne({ username: 'admin' });
  if (!pharmacyExists) {
    await PharmacyUser.create({
      username: 'admin',
      role: 'admin',
      passwordHash: '123'
    });
    console.log('✅ Created pharmacy user: admin (admin)');
  } else {
    console.log('ℹ️ Pharmacy user already exists: admin');
  }
  
  // Diagnostic user
  const diagnosticExists = await DiagnosticUser.findOne({ username: 'diagnostic' });
  if (!diagnosticExists) {
    await DiagnosticUser.create({
      username: 'diagnostic',
      role: 'admin',
      passwordHash: '123'
    });
    console.log('✅ Created diagnostic user: diagnostic (admin)');
  } else {
    console.log('ℹ️ Diagnostic user already exists: diagnostic');
  }
  
  console.log('\n🎉 All production users created successfully!');
  console.log('🔐 Default password for all users: 123');
  
  process.exit(0);
}

createProductionUsers().catch(console.error);

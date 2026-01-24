const { HospitalUser } = require('./dist/modules/hospital/models/User');
const { LabUser } = require('./dist/modules/lab/models/User');
const { PharmacyUser } = require('./dist/modules/pharmacy/models/User');
const { DiagnosticUser } = require('./dist/modules/diagnostic/models/User');
const { AestheticUser } = require('./dist/modules/aesthetic/models/User');
const { connectDB } = require('./dist/config/db');

async function createAllUsers() {
  await connectDB();
  
  console.log('🔧 Creating all users with specified credentials...');
  
  // Hospital users
  const hospitalUsers = [
    { username: 'admin', role: 'Admin', password: '123' },
    { username: 'admin1', role: 'Finance', password: '123' },
    { username: 'reception', role: 'Reception', password: '123' }
  ];
  
  for (const user of hospitalUsers) {
    const exists = await HospitalUser.findOne({ username: user.username });
    if (!exists) {
      await HospitalUser.create({
        username: user.username,
        role: user.role,
        passwordHash: user.password,
        active: true
      });
      console.log(`✅ Created hospital user: ${user.username} (${user.role})`);
    } else {
      // Update password
      await HospitalUser.updateOne(
        { username: user.username },
        { $set: { passwordHash: user.password } }
      );
      console.log(`🔄 Updated hospital user password: ${user.username} (${user.role})`);
    }
  }
  
  // Lab user
  const labExists = await LabUser.findOne({ username: 'lab' });
  if (!labExists) {
    await LabUser.create({
      username: 'lab',
      role: 'admin',
      passwordHash: '1234'
    });
    console.log('✅ Created lab user: lab (admin)');
  } else {
    await LabUser.updateOne(
      { username: 'lab' },
      { $set: { passwordHash: '1234' } }
    );
    console.log('🔄 Updated lab user password: lab');
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
    await PharmacyUser.updateOne(
      { username: 'admin' },
      { $set: { passwordHash: '123' } }
    );
    console.log('🔄 Updated pharmacy user password: admin');
  }
  
  // Diagnostic user
  const diagnosticExists = await DiagnosticUser.findOne({ username: 'diagnostic' });
  if (!diagnosticExists) {
    await DiagnosticUser.create({
      username: 'diagnostic',
      role: 'admin',
      passwordHash: '1234'
    });
    console.log('✅ Created diagnostic user: diagnostic (admin)');
  } else {
    await DiagnosticUser.updateOne(
      { username: 'diagnostic' },
      { $set: { passwordHash: '1234' } }
    );
    console.log('🔄 Updated diagnostic user password: diagnostic');
  }
  
  console.log('\n🎉 All users created/updated successfully!');
  console.log('\n🔐 LOGIN CREDENTIALS:');
  console.log('=====================================');
  console.log('🏥 HOSPITAL:');
  console.log('   Admin: username: admin, password: 123');
  console.log('   Finance: username: admin1, password: 123');
  console.log('   Reception: username: reception, password: 123');
  console.log('\n🧪 LAB:');
  console.log('   Admin: username: lab, password: 1234');
  console.log('\n💊 PHARMACY:');
  console.log('   Admin: username: admin, password: 123');
  console.log('\n🔬 DIAGNOSTIC:');
  console.log('   Admin: username: diagnostic, password: 1234');
  console.log('=====================================');
  
  process.exit(0);
}

createAllUsers().catch(console.error);

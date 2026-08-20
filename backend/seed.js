require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Dealer } = require('./models');

const seedData = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_FORCE !== 'true') {
      throw new Error('Seed script is blocked in production unless ALLOW_SEED_FORCE=true is set.');
    }

    await sequelize.sync({ force: true });
    console.log('Database synced.');

    const adminPass = await bcrypt.hash('admin123', 10);
    const dealerPass = await bcrypt.hash('dealer123', 10);
    const customerPass = await bcrypt.hash('customer123', 10);
    const techPass = await bcrypt.hash('tech123', 10);

    await User.create({
      name: 'Super Admin',
      email: 'admin@supergps.com',
      phone: '9999999999',
      password: adminPass,
      role: 'admin'
    });

    const dealerUser = await User.create({
      name: 'Test Dealer',
      email: 'dealer@supergps.com',
      phone: '8888888888',
      password: dealerPass,
      role: 'dealer'
    });

    await Dealer.create({
      userId: dealerUser.id,
      salesCode: 'DLR-ABC123',
      companyName: 'SuperGPS Dealership',
      address: '123 Main Road, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001'
    });

    await User.create({
      name: 'Test Customer',
      email: 'customer@supergps.com',
      phone: '7777777777',
      password: customerPass,
      role: 'customer'
    });

    await User.create({
      name: 'Test Technician',
      email: 'tech@supergps.com',
      phone: '6666666666',
      password: techPass,
      role: 'technician'
    });

    console.log('\n=== SEED DATA CREATED ===');
    console.log('Admin    : admin@supergps.com / admin123');
    console.log('Dealer   : dealer@supergps.com / dealer123 (Sales Code: DLR-ABC123)');
    console.log('Customer : customer@supergps.com / customer123');
    console.log('Technician: tech@supergps.com / tech123');
    console.log('=========================\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedData();

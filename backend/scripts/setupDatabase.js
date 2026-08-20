require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

const adminEmail = process.env.ADMIN_EMAIL || 'admin@supergps.com';
const adminName = process.env.ADMIN_NAME || 'Super Admin';
const adminPhone = process.env.ADMIN_PHONE || '9999999999';
const providedPassword = process.env.ADMIN_PASSWORD;
const generatedPassword = providedPassword || crypto.randomBytes(9).toString('base64url');

async function setupDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: process.env.DB_ALTER === 'true' });

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const [admin, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });

    if (!created) {
      admin.name = admin.name || adminName;
      admin.phone = admin.phone || adminPhone;
      admin.password = hashedPassword;
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
    }

    console.log('Database setup complete.');
    console.log(`Admin email: ${adminEmail}`);
    if (!providedPassword) {
      console.log(`Temporary admin password: ${generatedPassword}`);
    } else {
      console.log('Admin password: from ADMIN_PASSWORD env');
    }
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

setupDatabase();

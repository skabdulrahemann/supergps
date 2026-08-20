const bcrypt = require('bcryptjs');
const { User, Dealer } = require('../models');
const generateToken = require('../utils/generateToken');

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, companyName, address, city, state, pincode } = req.body;
    const userExists = await User.findOne({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hashedPassword, role: role || 'customer' });

    if (role === 'dealer') {
      const salesCode = 'DLR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await Dealer.create({ userId: user.id, salesCode, companyName, address, city, state, pincode });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    let dealerProfile = null;
    if (user.role === 'dealer') {
      dealerProfile = await Dealer.findOne({ where: { userId: user.id } });
    }

    res.json({
      success: true,
      token: generateToken(user.id),
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      dealerProfile
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    let dealerProfile = null;
    if (req.user.role === 'dealer') {
      dealerProfile = await Dealer.findOne({ where: { userId: req.user.id } });
    }
    res.json({ success: true, user: req.user, dealerProfile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

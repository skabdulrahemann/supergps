const bcrypt = require('bcryptjs');
const { User, Dealer, Order, Vehicle, ActivationLog, sequelize } = require('../models');

const genSalesCode = () => 'DLR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
const genPassword = () => Math.random().toString(36).slice(-8);

// GET /api/users?role=customer|dealer|technician|admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const where = {};
    if (role) where.role = role;

    let users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Dealer, as: 'dealerProfile' }],
      order: [['createdAt', 'DESC']],
    });

    if (search) {
      const term = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.phone?.includes(term)
      );
    }

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Dealer, as: 'dealerProfile' }],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/users  — admin creates a customer, dealer, technician or another admin
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, companyName, address, city, state, pincode } = req.body;

    if (!name || !email || !phone || !role) {
      return res.status(400).json({ message: 'name, email, phone and role are required' });
    }
    if (!['customer', 'dealer', 'technician', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const plainPassword = password && password.length >= 6 ? password : genPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({ name, email, phone, password: hashedPassword, role });

    let dealerProfile = null;
    if (role === 'dealer') {
      dealerProfile = await Dealer.create({
        userId: user.id,
        salesCode: genSalesCode(),
        companyName: companyName || '',
        address: address || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
      });
    }

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created`,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive },
      dealerProfile,
      // Only returned once at creation time so the admin can share it — never stored in plaintext.
      generatedPassword: password && password.length >= 6 ? undefined : plainPassword,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, phone, isActive, password, companyName, address, city, state, pincode } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (password && password.length >= 6) user.password = await bcrypt.hash(password, 10);
    await user.save();

    if (user.role === 'dealer') {
      const dealer = await Dealer.findOne({ where: { userId: user.id } });
      if (dealer) {
        if (companyName !== undefined) dealer.companyName = companyName;
        if (address !== undefined) dealer.address = address;
        if (city !== undefined) dealer.city = city;
        if (state !== undefined) dealer.state = state;
        if (pincode !== undefined) dealer.pincode = pincode;
        await dealer.save();
      }
    }

    res.json({ success: true, message: 'User updated', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id — cascades so the admin panel delete button always works cleanly
exports.deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.id === req.user.id) {
      await t.rollback();
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    if (user.role === 'dealer') {
      const dealer = await Dealer.findOne({ where: { userId: user.id }, transaction: t });
      if (dealer) {
        // Detach (don't destroy) the dealer's customers' orders/vehicles — just remove the dealer link.
        await Order.update({ dealerId: null }, { where: { dealerId: dealer.id }, transaction: t });
        await Vehicle.update({ dealerId: null }, { where: { dealerId: dealer.id }, transaction: t });
        await ActivationLog.destroy({ where: { dealerId: dealer.id }, transaction: t });
        await dealer.destroy({ transaction: t });
      }
    }

    if (user.role === 'technician') {
      await ActivationLog.update({ technicianId: null }, { where: { technicianId: user.id }, transaction: t });
      await Vehicle.update({ activatedBy: null }, { where: { activatedBy: user.id }, transaction: t });
    }

    if (user.role === 'customer') {
      // A customer's own orders/vehicles/activation history belong to them — remove together.
      const vehicles = await Vehicle.findAll({ where: { customerId: user.id }, transaction: t });
      const vehicleIds = vehicles.map((v) => v.id);
      if (vehicleIds.length) {
        await ActivationLog.destroy({ where: { vehicleId: vehicleIds }, transaction: t });
        await Vehicle.destroy({ where: { customerId: user.id }, transaction: t });
      }
      await Order.destroy({ where: { customerId: user.id }, transaction: t });
    }

    await user.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

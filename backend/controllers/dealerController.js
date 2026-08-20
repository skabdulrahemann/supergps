const { Dealer, User, Order, Vehicle, sequelize } = require('../models');

exports.getAllDealers = async (req, res) => {
  try {
    const dealers = await Dealer.findAll({
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone', 'isActive'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: dealers.length, dealers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDealerById = async (req, res) => {
  try {
    const dealer = await Dealer.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
        { model: Order, as: 'orders' },
        { model: Vehicle, as: 'vehicles' }
      ]
    });
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
    res.json({ success: true, dealer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyDealerProfile = async (req, res) => {
  try {
    const dealer = await Dealer.findOne({
      where: { userId: req.user.id },
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone'] }]
    });
    if (!dealer) return res.status(404).json({ message: 'Dealer profile not found' });
    res.json({ success: true, dealer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDealerProfile = async (req, res) => {
  try {
    const dealer = await Dealer.findOne({ where: { userId: req.user.id } });
    if (!dealer) return res.status(404).json({ message: 'Dealer profile not found' });
    const { companyName, address, city, state, pincode } = req.body;
    await dealer.update({ companyName, address, city, state, pincode });
    res.json({ success: true, message: 'Profile updated', dealer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/dealers/:id — admin removes a dealer. Their customers' orders/vehicles are kept,
// just detached from the dealer (set to "Direct"), matching how deleteUser handles dealers.
exports.deleteDealer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const dealer = await Dealer.findByPk(req.params.id, { transaction: t });
    if (!dealer) {
      await t.rollback();
      return res.status(404).json({ message: 'Dealer not found' });
    }

    await Order.update({ dealerId: null }, { where: { dealerId: dealer.id }, transaction: t });
    await Vehicle.update({ dealerId: null }, { where: { dealerId: dealer.id }, transaction: t });

    const userId = dealer.userId;
    await dealer.destroy({ transaction: t });
    if (userId) await User.destroy({ where: { id: userId }, transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Dealer deleted' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};
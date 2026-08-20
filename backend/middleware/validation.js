const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').isMobilePhone().withMessage('Valid phone required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  handleValidation
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidation
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Confirm password must match new password'),
  handleValidation
];

const orderRules = [
  body('targetVehicleNumber')
    .trim()
    .notEmpty()
    .withMessage('Vehicle number is required before placing an order'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('price').isDecimal().withMessage('Valid price required'),
  body('shippingAddress').trim().notEmpty().withMessage('Shipping address required'),
  handleValidation
];

const activationRules = [
  body('imeiNumber').trim().notEmpty().withMessage('IMEI required'),
  body('deviceSerialNumber').trim().notEmpty().withMessage('Serial number required'),
  handleValidation
];

const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').isMobilePhone().withMessage('Valid phone required'),
  body('role').isIn(['customer', 'dealer', 'technician', 'admin']).withMessage('Invalid role'),
  handleValidation
];

const createVehicleRules = [
  body('customerId').notEmpty().withMessage('customerId is required'),
  body('imeiNumber').trim().notEmpty().withMessage('IMEI required'),
  body('deviceSerialNumber').trim().notEmpty().withMessage('Serial number required'),
  handleValidation
];

module.exports = {
  registerRules,
  loginRules,
  changePasswordRules,
  orderRules,
  activationRules,
  createUserRules,
  createVehicleRules,
  handleValidation
};

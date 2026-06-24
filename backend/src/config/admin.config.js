export const FIXED_ADMIN = Object.freeze({
  id: 'admin-fixed-account',
  fullName: 'System Admin',
  mobileNumber: '9322955167',
  password: '123456',
  role: 'admin',
});

export const isFixedAdminCredentials = (mobileNumber, password) =>
  mobileNumber === FIXED_ADMIN.mobileNumber && password === FIXED_ADMIN.password;

export const buildFixedAdminUser = () => ({
  _id: FIXED_ADMIN.id,
  fullName: FIXED_ADMIN.fullName,
  mobileNumber: FIXED_ADMIN.mobileNumber,
  role: FIXED_ADMIN.role,
});




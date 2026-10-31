export const homeFor = (role) =>
  role === 'admin' ? '/admin' : role === 'meter_reader' ? '/reader' : '/my';
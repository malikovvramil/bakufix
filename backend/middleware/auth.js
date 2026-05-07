const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tapılmadı' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token etibarsızdır' });
  }
};

const role = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
  }
  next();
};

// Like auth but doesn't reject — sets req.user to null if no/invalid token
const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch { req.user = null; }
  } else {
    req.user = null;
  }
  next();
};

module.exports = { auth, role, optionalAuth };

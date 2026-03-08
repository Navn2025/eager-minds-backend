import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
export function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    const token = header.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: "Insufficient permissions" });
            return;
        }
        next();
    };
}
export function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        next();
        return;
    }
    const token = header.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    }
    catch {
        // Token invalid, continue without user
    }
    next();
}

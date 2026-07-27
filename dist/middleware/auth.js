"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token)
        return res.status(401).json({ success: false, message: 'Authentication required' });
    try {
        req.auth = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        return next();
    }
    catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}
function requireAdmin(req, res, next) {
    return requireAuth(req, res, () => {
        const auth = req.auth;
        if (!auth.admin)
            return res.status(403).json({ success: false, message: 'Admin access required' });
        next();
    });
}

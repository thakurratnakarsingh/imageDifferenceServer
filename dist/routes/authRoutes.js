"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
exports.authRoutes = (0, express_1.Router)();
const sign = (payload) => jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
exports.authRoutes.post('/register', async (req, res) => {
    const { name, email, password, deviceId } = req.body;
    if (!password || String(password).length < 8 || !deviceId)
        return res.status(400).json({ success: false, message: 'Password (8+ characters) and deviceId are required' });
    const user = await models_1.User.create({ name, email: email || null, deviceId, passwordHash: await bcryptjs_1.default.hash(password, 12) });
    res.status(201).json({ success: true, data: { token: sign({ sub: user.id, role: 'player' }), user: { id: user.id, name: user.name } } });
});
exports.authRoutes.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await models_1.User.findOne({ where: { email } });
    if (!user || !user.get('passwordHash') || !await bcryptjs_1.default.compare(password ?? '', String(user.get('passwordHash')))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({ success: true, data: { token: sign({ sub: user.id, role: 'player' }), user } });
});
exports.authRoutes.post('/admin/login', async (req, res) => {
    const admin = await models_1.Admin.findOne({ where: { email: req.body.email, isActive: true } });
    if (!admin || !await bcryptjs_1.default.compare(req.body.password ?? '', admin.passwordHash)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    await admin.update({ lastLoginAt: new Date() });
    res.json({ success: true, data: { token: sign({ sub: admin.id, role: admin.role, admin: true }), admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } } });
});
exports.authRoutes.get('/profile', auth_1.requireAuth, async (req, res) => res.json({ success: true, data: { authenticated: true } }));

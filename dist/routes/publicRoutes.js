"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRoutes = void 0;
const express_1 = require("express");
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
exports.publicRoutes = (0, express_1.Router)();
exports.publicRoutes.get('/splash', async (_req, res) => {
    const rows = await database_1.sequelize.query('SELECT id, title, subtitle, logo_path AS logoPath, background_image_path AS backgroundImagePath, background_color AS backgroundColor, text_color AS textColor, display_duration AS displayDuration FROM splash_screens WHERE is_active = 1 ORDER BY id DESC LIMIT 1', { type: sequelize_1.QueryTypes.SELECT });
    res.json({ success: true, data: rows[0] ?? { title: 'Find 10 Differences', subtitle: 'Look closer. Tap smarter.', backgroundColor: '#071815', textColor: '#FFFFFF', displayDuration: 1800 } });
});
exports.publicRoutes.get('/actresses', async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const result = await models_1.Actress.findAndCountAll({ where: { isActive: true }, limit, offset: (page - 1) * limit, order: [['name', 'ASC']] });
    const counts = await Promise.all(result.rows.map(item => models_1.Level.count({ where: { actressId: item.id, isActive: true } })));
    res.json({ success: true, data: result.rows.map((item, i) => ({ ...item.toJSON(), availableLevelCount: counts[i] })), meta: { page, limit, total: result.count } });
});
exports.publicRoutes.get('/actresses/:id', async (req, res) => {
    const item = await models_1.Actress.findByPk(req.params.id);
    if (!item || !item.isActive)
        return res.status(404).json({ success: false, message: 'Actress not found' });
    res.json({ success: true, data: item });
});

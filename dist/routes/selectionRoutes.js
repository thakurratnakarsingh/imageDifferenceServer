"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectionRoutes = void 0;
const express_1 = require("express");
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const models_1 = require("../models");
exports.selectionRoutes = (0, express_1.Router)();
exports.selectionRoutes.get('/:deviceId', async (req, res) => {
    const rows = await database_1.sequelize.query('SELECT actress_id AS actressId FROM player_actress_selections WHERE device_id = ?', { replacements: [req.params.deviceId], type: sequelize_1.QueryTypes.SELECT });
    res.json({ success: true, data: rows.map((row) => row.actressId) });
});
exports.selectionRoutes.post('/', save);
exports.selectionRoutes.put('/:deviceId', save);
exports.selectionRoutes.delete('/:deviceId', async (req, res) => {
    await database_1.sequelize.query('DELETE FROM player_actress_selections WHERE device_id = ?', { replacements: [req.params.deviceId] });
    res.status(204).end();
});
async function save(req, res) {
    const deviceId = req.params.deviceId ?? req.body.deviceId;
    const actressIds = [...new Set((req.body.actressIds ?? []).map(Number))];
    if (!deviceId || !actressIds.length)
        return res.status(400).json({ success: false, message: 'deviceId and at least one actressId are required' });
    const count = await models_1.Actress.count({ where: { id: actressIds, isActive: true } });
    if (count !== actressIds.length)
        return res.status(400).json({ success: false, message: 'Selection includes an unavailable actress' });
    await database_1.sequelize.transaction(async (transaction) => {
        await database_1.sequelize.query('DELETE FROM player_actress_selections WHERE device_id = ?', { replacements: [deviceId], transaction });
        for (const actressId of actressIds)
            await database_1.sequelize.query('INSERT INTO player_actress_selections (device_id, actress_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', { replacements: [deviceId, actressId], transaction });
    });
    res.json({ success: true, data: { deviceId, actressIds } });
}

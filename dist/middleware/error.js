"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = notFound;
exports.errorHandler = errorHandler;
const multer_1 = require("multer");
const env_1 = require("../config/env");
function notFound(_req, res) {
    res.status(404).json({ success: false, message: 'Route not found' });
}
function errorHandler(error, _req, res, _next) {
    const declared = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;
    const status = error instanceof multer_1.MulterError ? 400 : declared >= 400 && declared < 600 ? declared : 500;
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    res.status(status).json({
        success: false,
        message: env_1.env.NODE_ENV === 'production' && status === 500 ? 'Unexpected server error' : message
    });
}

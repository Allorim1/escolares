"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ofertas_controller_1 = require("../controllers/ofertas.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/ofertas:
 *   get:
 *     summary: Obtener todas las ofertas
 *     tags: [Ofertas]
 *     responses:
 *       200:
 *         description: Lista de ofertas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Oferta'
 */
router.get('/', (req, res) => ofertas_controller_1.ofertasController.getAll(req, res));
/**
 * @swagger
 * /api/ofertas/product/{productId}:
 *   get:
 *     summary: Obtener oferta por ID de producto
 *     tags: [Ofertas]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Oferta encontrada
 */
router.get('/product/:productId', (req, res) => ofertas_controller_1.ofertasController.getByProductId(req, res));
/**
 * @swagger
 * /api/ofertas:
 *   post:
 *     summary: Crear o actualizar una oferta
 *     tags: [Ofertas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - precioOferta
 *             properties:
 *               productId:
 *                 type: number
 *               precioOferta:
 *                 type: number
 *     responses:
 *       201:
 *         description: Oferta creada
 */
router.post('/', (req, res) => ofertas_controller_1.ofertasController.create(req, res));
/**
 * @swagger
 * /api/ofertas/product/{productId}:
 *   delete:
 *     summary: Eliminar una oferta
 *     tags: [Ofertas]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       204:
 *         description: Oferta eliminada
 */
router.delete('/product/:productId', (req, res) => ofertas_controller_1.ofertasController.delete(req, res));
exports.default = router;
//# sourceMappingURL=ofertas.routes.js.map
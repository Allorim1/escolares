"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ofertasController = exports.OfertasController = void 0;
const database_1 = require("../config/database");
class OfertasController {
    async getAll(req, res) {
        try {
            const ofertas = await database_1.database.getCollection('ofertas').find({}).toArray();
            res.json(ofertas);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener ofertas' });
        }
    }
    async getByProductId(req, res) {
        try {
            const productId = parseInt(req.params.productId);
            const oferta = await database_1.database.getCollection('ofertas').findOne({ productId });
            res.json(oferta);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener oferta' });
        }
    }
    async create(req, res) {
        try {
            const { productId, precioOferta } = req.body;
            if (!productId || !precioOferta) {
                res.status(400).json({ error: 'productId y precioOferta son requeridos' });
                return;
            }
            const existingOferta = await database_1.database.getCollection('ofertas').findOne({ productId });
            if (existingOferta) {
                const result = await database_1.database
                    .getCollection('ofertas')
                    .findOneAndUpdate({ productId }, { $set: { precioOferta } }, { returnDocument: 'after' });
                res.json(result);
                return;
            }
            const newOferta = { productId, precioOferta };
            await database_1.database.getCollection('ofertas').insertOne(newOferta);
            res.status(201).json(newOferta);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al crear oferta' });
        }
    }
    async delete(req, res) {
        try {
            const productId = parseInt(req.params.productId);
            const result = await database_1.database.getCollection('ofertas').deleteOne({ productId });
            if (result.deletedCount === 0) {
                res.status(404).json({ error: 'Oferta no encontrada' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Error al eliminar oferta' });
        }
    }
}
exports.OfertasController = OfertasController;
exports.ofertasController = new OfertasController();
//# sourceMappingURL=ofertas.controller.js.map
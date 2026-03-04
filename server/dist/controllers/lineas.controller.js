"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineasController = exports.LineasController = void 0;
const database_1 = require("../config/database");
class LineasController {
    async getAll(req, res) {
        try {
            const lineas = await database_1.database.getCollection('lineas').find({}).toArray();
            res.json(lineas);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener líneas' });
        }
    }
    async getById(req, res) {
        try {
            const linea = await database_1.database.getCollection('lineas').findOne({ id: req.params.id });
            if (!linea) {
                res.status(404).json({ error: 'Línea no encontrada' });
                return;
            }
            res.json(linea);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener línea' });
        }
    }
    async create(req, res) {
        try {
            const { name, image } = req.body;
            if (!name) {
                res.status(400).json({ error: 'El nombre es requerido' });
                return;
            }
            const newLinea = {
                id: Date.now().toString(),
                name,
                image: image || '',
                productIds: [],
            };
            await database_1.database.getCollection('lineas').insertOne(newLinea);
            res.status(201).json(newLinea);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al crear línea' });
        }
    }
    async update(req, res) {
        try {
            const { name, image, productIds } = req.body;
            const result = await database_1.database
                .getCollection('lineas')
                .findOneAndUpdate({ id: req.params.id }, { $set: { name, image, productIds } }, { returnDocument: 'after' });
            if (!result) {
                res.status(404).json({ error: 'Línea no encontrada' });
                return;
            }
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al actualizar línea' });
        }
    }
    async delete(req, res) {
        try {
            const result = await database_1.database.getCollection('lineas').deleteOne({ id: req.params.id });
            if (result.deletedCount === 0) {
                res.status(404).json({ error: 'Línea no encontrada' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Error al eliminar línea' });
        }
    }
    async addProduct(req, res) {
        try {
            const { productId } = req.body;
            const result = await database_1.database
                .getCollection('lineas')
                .findOneAndUpdate({ id: req.params.id }, { $addToSet: { productIds: productId } }, { returnDocument: 'after' });
            if (!result) {
                res.status(404).json({ error: 'Línea no encontrada' });
                return;
            }
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al añadir producto' });
        }
    }
    async removeProduct(req, res) {
        try {
            const { productId } = req.body;
            const result = await database_1.database
                .getCollection('lineas')
                .findOneAndUpdate({ id: req.params.id }, { $pull: { productIds: productId } }, { returnDocument: 'after' });
            if (!result) {
                res.status(404).json({ error: 'Línea no encontrada' });
                return;
            }
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al eliminar producto' });
        }
    }
}
exports.LineasController = LineasController;
exports.lineasController = new LineasController();
//# sourceMappingURL=lineas.controller.js.map
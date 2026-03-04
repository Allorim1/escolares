"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marcasController = exports.MarcasController = void 0;
const database_1 = require("../config/database");
class MarcasController {
    async getAll(req, res) {
        try {
            const marcas = await database_1.database.getCollection('marcas').find({}).toArray();
            res.json(marcas);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener marcas' });
        }
    }
    async getById(req, res) {
        try {
            const marca = await database_1.database.getCollection('marcas').findOne({ id: req.params.id });
            if (!marca) {
                res.status(404).json({ error: 'Marca no encontrada' });
                return;
            }
            res.json(marca);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener marca' });
        }
    }
    async create(req, res) {
        try {
            const { name, image } = req.body;
            if (!name) {
                res.status(400).json({ error: 'El nombre es requerido' });
                return;
            }
            const newMarca = {
                id: Date.now().toString(),
                name,
                image: image || '',
            };
            await database_1.database.getCollection('marcas').insertOne(newMarca);
            res.status(201).json(newMarca);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al crear marca' });
        }
    }
    async update(req, res) {
        try {
            const { name, image } = req.body;
            const result = await database_1.database
                .getCollection('marcas')
                .findOneAndUpdate({ id: req.params.id }, { $set: { name, image } }, { returnDocument: 'after' });
            if (!result) {
                res.status(404).json({ error: 'Marca no encontrada' });
                return;
            }
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al actualizar marca' });
        }
    }
    async delete(req, res) {
        try {
            const result = await database_1.database.getCollection('marcas').deleteOne({ id: req.params.id });
            if (result.deletedCount === 0) {
                res.status(404).json({ error: 'Marca no encontrada' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Error al eliminar marca' });
        }
    }
}
exports.MarcasController = MarcasController;
exports.marcasController = new MarcasController();
//# sourceMappingURL=marcas.controller.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const database_1 = require("../config/database");
class AuthController {
    async register(req, res) {
        try {
            const { username, email, password } = req.body;
            console.log('Register request:', { username, email, password });
            if (!username || !email || !password) {
                res.status(400).json({ error: 'Todos los campos son requeridos' });
                return;
            }
            const existingUser = await database_1.database.getCollection('users').findOne({ email });
            if (existingUser) {
                res.status(400).json({ error: 'El email ya está registrado' });
                return;
            }
            const newUser = {
                id: Date.now().toString(),
                username,
                email,
                password,
                isAdmin: false,
                rol: 'usuario',
            };
            await database_1.database.getCollection('users').insertOne(newUser);
            const { password: _, ...userWithoutPassword } = newUser;
            res.status(201).json(userWithoutPassword);
        }
        catch (error) {
            console.error('Error en register:', error);
            res.status(500).json({ error: 'Error al registrar usuario' });
        }
    }
    async login(req, res) {
        try {
            const { email, username, password } = req.body;
            const identifier = email || username;
            if (!identifier || !password) {
                res.status(400).json({ error: 'Email/username y contraseña son requeridos' });
                return;
            }
            const user = await database_1.database.getCollection('users').findOne({
                $or: [{ email: identifier }, { username: identifier }],
                password,
            });
            if (!user) {
                res.status(401).json({ error: 'Credenciales inválidas' });
                return;
            }
            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al iniciar sesión' });
        }
    }
    async getProfile(req, res) {
        try {
            const userId = req.userId;
            const user = await database_1.database.getCollection('users').findOne({ id: userId });
            if (!user) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }
            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener perfil' });
        }
    }
    async getAll(req, res) {
        try {
            const users = await database_1.database.getCollection('users').find({}).toArray();
            const usersWithoutPassword = users.map(({ password, ...user }) => user);
            res.json(usersWithoutPassword);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al obtener usuarios' });
        }
    }
    async update(req, res) {
        try {
            const { userId, username, email, nombreCompleto, direccion, telefono } = req.body;
            if (!userId) {
                res.status(400).json({ error: 'ID de usuario requerido' });
                return;
            }
            const updateData = {};
            if (username)
                updateData.username = username;
            if (email)
                updateData.email = email;
            if (nombreCompleto !== undefined)
                updateData.nombreCompleto = nombreCompleto;
            if (direccion !== undefined)
                updateData.direccion = direccion;
            if (telefono !== undefined)
                updateData.telefono = telefono;
            const result = await database_1.database
                .getCollection('users')
                .findOneAndUpdate({ id: userId }, { $set: updateData }, { returnDocument: 'after' });
            if (!result) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }
            const { password: _, ...userWithoutPassword } = result;
            res.json(userWithoutPassword);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al actualizar usuario' });
        }
    }
    async updateRol(req, res) {
        try {
            const { targetUserId, rol } = req.body;
            const solicitanteRol = req.userRol;
            if (!targetUserId || !rol) {
                res.status(400).json({ error: 'ID de usuario y rol requeridos' });
                return;
            }
            if (rol === 'owner') {
                res.status(403).json({ error: 'No se puede asignar rol de owner' });
                return;
            }
            if (rol === 'admin' && solicitanteRol !== 'owner') {
                res.status(403).json({ error: 'Solo el owner puede asignar rol de admin' });
                return;
            }
            if (rol === 'empleado' && solicitanteRol === 'usuario') {
                res.status(403).json({ error: 'No tienes permisos para asignar roles' });
                return;
            }
            if (solicitanteRol === 'admin' && rol === 'admin') {
                res.status(403).json({ error: 'Un admin no puede asignar rol de admin' });
                return;
            }
            const result = await database_1.database
                .getCollection('users')
                .findOneAndUpdate({ id: targetUserId }, { $set: { rol, isAdmin: rol === 'admin' } }, { returnDocument: 'after' });
            if (!result) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }
            const { password: _, ...userWithoutPassword } = result;
            res.json(userWithoutPassword);
        }
        catch (error) {
            res.status(500).json({ error: 'Error al actualizar rol' });
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map
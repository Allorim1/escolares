"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
const mongodb_1 = require("mongodb");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const MONGODB_URL = 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env['mongodb_dbname'] || 'test';
let dbInstance = null;
class Database {
    client = null;
    db = null;
    async connect() {
        if (this.db)
            return true;
        try {
            this.client = new mongodb_1.MongoClient(MONGODB_URL, { family: 4, connectTimeoutMS: 10000 });
            await this.client.connect();
            this.db = this.client.db(DB_NAME);
            dbInstance = this.db;
            console.log('Conectado a MongoDB');
            await this.initCollections();
            return true;
        }
        catch (error) {
            console.error('Error conectando a MongoDB:', error);
            console.warn('Iniciando servidor sin conexión a MongoDB (modo desarrollo)');
            return false;
        }
    }
    async initCollections() {
        if (!this.db)
            return;
        const collections = await this.db.listCollections().toArray();
        const collectionNames = collections.map((c) => c.name);
        const requiredCollections = ['marcas', 'lineas', 'ofertas', 'users', 'products'];
        for (const name of requiredCollections) {
            if (!collectionNames.includes(name)) {
                await this.db.createCollection(name);
                console.log(`Colección '${name}' creada`);
            }
        }
        await this.seedData();
    }
    async seedData() {
        if (!this.db)
            return;
        const marcasCount = await this.db.collection('marcas').countDocuments();
        if (marcasCount === 0) {
            await this.db.collection('marcas').insertMany([
                { id: '1', name: 'Nike', image: '' },
                { id: '2', name: 'Adidas', image: '' },
                { id: '3', name: 'Puma', image: '' },
                { id: '4', name: 'Apple', image: '' },
                { id: '5', name: 'Samsung', image: '' },
            ]);
        }
        const lineasCount = await this.db.collection('lineas').countDocuments();
        if (lineasCount === 0) {
            await this.db.collection('lineas').insertMany([
                {
                    id: '1',
                    name: 'Bolsos y Cartuchera',
                    image: '/lineas/BOLSOS-Y-CARTUCHERA.png',
                    productIds: [],
                },
                {
                    id: '2',
                    name: 'Línea de Papelería',
                    image: '/lineas/manchas-LINEA-DE-PAPELERIA.png',
                    productIds: [],
                },
                {
                    id: '3',
                    name: 'Línea de Geometría',
                    image: '/lineas/manchas-LIBEA-DE-GEOMETRIA.png',
                    productIds: [],
                },
                {
                    id: '4',
                    name: 'Línea de Manualidades',
                    image: '/lineas/MANCHAS-PARA-LINEA-DE-MANUALIDADES.png',
                    productIds: [],
                },
                {
                    id: '5',
                    name: 'Línea Escolar',
                    image: '/lineas/MANCHA-PARA-LINEA-ESCOLAR.png',
                    productIds: [],
                },
                {
                    id: '6',
                    name: 'Higiene Personal',
                    image: '/lineas/MANCHA-DE-HIGIENE-PERSONAL.png',
                    productIds: [],
                },
                {
                    id: '7',
                    name: 'Línea de Oficina',
                    image: '/lineas/MANCHA-LINEA-DE-OFICINA.png',
                    productIds: [],
                },
                {
                    id: '8',
                    name: 'Línea de Escritura',
                    image: '/lineas/MANCHA-LINEA-DE-ESCRITURA-V1.png',
                    productIds: [],
                },
            ]);
        }
    }
    getCollection(name) {
        if (!this.db)
            throw new Error('Base de datos no conectada');
        return this.db.collection(name);
    }
    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }
}
exports.database = new Database();
//# sourceMappingURL=database.js.map
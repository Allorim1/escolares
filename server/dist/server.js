"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const database_1 = require("./config/database");
const swagger_1 = require("./config/swagger");
const marcas_routes_1 = __importDefault(require("./routes/marcas.routes"));
const lineas_routes_1 = __importDefault(require("./routes/lineas.routes"));
const ofertas_routes_1 = __importDefault(require("./routes/ofertas.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const swaggerSpec = (0, swagger_jsdoc_1.default)(swagger_1.swaggerConfig);
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Escolares - Swagger',
}));
app.get('/swagger.json', (req, res) => {
    res.json(swaggerSpec);
});
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'API Escolares funcionando' });
});
app.use('/api/marcas', marcas_routes_1.default);
app.use('/api/lineas', lineas_routes_1.default);
app.use('/api/ofertas', ofertas_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});
async function startServer() {
    const dbConnected = await database_1.database.connect();
    app.listen(PORT, () => {
        if (dbConnected) {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
            console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);
        }
        else {
            console.log(`Servidor ejecutándose en http://localhost:${PORT} (sin MongoDB)`);
            console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);
            console.log('ADVERTENCIA: MongoDB no conectado - algunas funciones pueden no funcionar');
        }
    });
}
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map
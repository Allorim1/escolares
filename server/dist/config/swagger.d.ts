export declare const swaggerConfig: {
    definition: {
        openapi: string;
        info: {
            title: string;
            version: string;
            description: string;
            contact: {
                name: string;
                email: string;
            };
        };
        servers: {
            url: string;
            description: string;
        }[];
        components: {
            schemas: {
                Marca: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                            example: string;
                        };
                        name: {
                            type: string;
                            example: string;
                        };
                        image: {
                            type: string;
                            example: string;
                        };
                    };
                };
                Linea: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                            example: string;
                        };
                        name: {
                            type: string;
                            example: string;
                        };
                        image: {
                            type: string;
                            example: string;
                        };
                        productIds: {
                            type: string;
                            items: {
                                type: string;
                            };
                            example: number[];
                        };
                    };
                };
                Oferta: {
                    type: string;
                    properties: {
                        productId: {
                            type: string;
                            example: number;
                        };
                        precioOferta: {
                            type: string;
                            example: number;
                        };
                    };
                };
                User: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                            example: string;
                        };
                        username: {
                            type: string;
                            example: string;
                        };
                        email: {
                            type: string;
                            example: string;
                        };
                        isAdmin: {
                            type: string;
                            example: boolean;
                        };
                    };
                };
                Product: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                            example: number;
                        };
                        name: {
                            type: string;
                            example: string;
                        };
                        description: {
                            type: string;
                            example: string;
                        };
                        price: {
                            type: string;
                            example: number;
                        };
                        image: {
                            type: string;
                            example: string;
                        };
                        marcaId: {
                            type: string;
                            example: string;
                        };
                        lineaId: {
                            type: string;
                            example: string;
                        };
                        stock: {
                            type: string;
                            example: number;
                        };
                    };
                };
                Error: {
                    type: string;
                    properties: {
                        error: {
                            type: string;
                            example: string;
                        };
                    };
                };
            };
            securitySchemes: {
                bearerAuth: {
                    type: string;
                    scheme: string;
                    bearerFormat: string;
                };
            };
        };
        security: {
            bearerAuth: never[];
        }[];
    };
    apis: string[];
};
export declare const schemas: {
    Marca: {
        type: string;
        properties: {
            id: {
                type: string;
                example: string;
            };
            name: {
                type: string;
                example: string;
            };
            image: {
                type: string;
                example: string;
            };
        };
    };
    Linea: {
        type: string;
        properties: {
            id: {
                type: string;
                example: string;
            };
            name: {
                type: string;
                example: string;
            };
            image: {
                type: string;
                example: string;
            };
            productIds: {
                type: string;
                items: {
                    type: string;
                };
                example: number[];
            };
        };
    };
    Oferta: {
        type: string;
        properties: {
            productId: {
                type: string;
                example: number;
            };
            precioOferta: {
                type: string;
                example: number;
            };
        };
    };
    User: {
        type: string;
        properties: {
            id: {
                type: string;
                example: string;
            };
            username: {
                type: string;
                example: string;
            };
            email: {
                type: string;
                example: string;
            };
            isAdmin: {
                type: string;
                example: boolean;
            };
        };
    };
    Product: {
        type: string;
        properties: {
            id: {
                type: string;
                example: number;
            };
            name: {
                type: string;
                example: string;
            };
            description: {
                type: string;
                example: string;
            };
            price: {
                type: string;
                example: number;
            };
            image: {
                type: string;
                example: string;
            };
            marcaId: {
                type: string;
                example: string;
            };
            lineaId: {
                type: string;
                example: string;
            };
            stock: {
                type: string;
                example: number;
            };
        };
    };
    Error: {
        type: string;
        properties: {
            error: {
                type: string;
                example: string;
            };
        };
    };
};
export declare const responses: {
    notFound: {
        description: string;
        content: {
            'application/json': {
                schema: {
                    $ref: string;
                };
            };
        };
    };
    badRequest: {
        description: string;
        content: {
            'application/json': {
                schema: {
                    $ref: string;
                };
            };
        };
    };
    internalError: {
        description: string;
        content: {
            'application/json': {
                schema: {
                    $ref: string;
                };
            };
        };
    };
};
//# sourceMappingURL=swagger.d.ts.map
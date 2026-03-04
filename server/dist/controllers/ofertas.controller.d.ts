import { Request, Response } from 'express';
export declare class OfertasController {
    getAll(req: Request, res: Response): Promise<void>;
    getByProductId(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
}
export declare const ofertasController: OfertasController;
//# sourceMappingURL=ofertas.controller.d.ts.map
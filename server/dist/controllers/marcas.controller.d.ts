import { Request, Response } from 'express';
export declare class MarcasController {
    getAll(req: Request, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
}
export declare const marcasController: MarcasController;
//# sourceMappingURL=marcas.controller.d.ts.map
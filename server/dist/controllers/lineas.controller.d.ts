import { Request, Response } from 'express';
export declare class LineasController {
    getAll(req: Request, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    delete(req: Request, res: Response): Promise<void>;
    addProduct(req: Request, res: Response): Promise<void>;
    removeProduct(req: Request, res: Response): Promise<void>;
}
export declare const lineasController: LineasController;
//# sourceMappingURL=lineas.controller.d.ts.map
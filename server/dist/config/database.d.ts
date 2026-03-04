import { Collection, Document } from 'mongodb';
declare class Database {
    private client;
    private db;
    connect(): Promise<boolean>;
    private initCollections;
    private seedData;
    getCollection<T extends Document>(name: string): Collection<T>;
    close(): Promise<void>;
}
export declare const database: Database;
export {};
//# sourceMappingURL=database.d.ts.map
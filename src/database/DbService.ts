import lowdb from "lowdb";
import { default as FileAsync } from "lowdb/adapters/FileAsync";
import { DbSchema, defaultSchema } from "./DbSchema";

export class GenericDbService {}

export class DbService {
    private db!: lowdb.LowdbAsync<DbSchema>;

    private constructor() {/*Disabled*/}

    public static async newInstance(): Promise<DbService> {
        const service = new DbService();
        await service.initDatabase();
        return service;
    }

    private async initDatabase(): Promise<void> {
        const path = "db.json";
        const adapter = new FileAsync(path);
        const db = await lowdb(adapter);
        if (!db) {
            throw new Error("Database couldn't be initialized");
        }
        if (!db.has('init').value()) {
            // potential to update tb here when init is present but false
            db.defaults(defaultSchema).write();
            db.update('init', i => true).write();
        }
        this.db = db;
    }

    public getCustomDbService(func: (db: lowdb.LowdbAsync<DbSchema>) => GenericDbService ): GenericDbService {
        return func(this.db);
    }
}
import lowdb from "lowdb";
import { default as FileAsync } from "lowdb/adapters/FileAsync";
import { DbSchema, defaultSchema, GUILD_DB_IDENTIFIER } from "./DbSchema";

export class GenericDbService {}

export class DbService {
    private db!: lowdb.LowdbAsync<DbSchema>;

    private constructor() {}

    public static async newInstance(): Promise<DbService> {
        const service = new DbService();
        await service.initDatabase();
        return service;
    }

    private async initDatabase(): Promise<void> {
        const adapter = new FileAsync("db.json");
        const db = await lowdb(adapter);
        if (!db) {
            throw new Error("Database couldn't be initialized");
        }
        if (!db.has("init")) {
            db.defaults(defaultSchema).write();
        }
        this.db = db;
    }

    public getCustomDbService(func: (db: lowdb.LowdbAsync<DbSchema>) => GenericDbService ): GenericDbService {
        return func(this.db);
    }
}
import lowdb from "lowdb";
import { default as FileAsync } from "lowdb/adapters/FileAsync";
import { CatModuleStatistics, PictureCacheModel, SendPicturesModel } from "./CatModule";
 
export interface DbSchema {
    guilds: string[],
    cat_pictures: PictureCacheModel[],
    cat_sendCache: SendPicturesModel[],
    cat_stats: CatModuleStatistics
}

export class GenericDbService {}

export const PICTURES_IDENTIFIER = "cat_pictures";
export const GUILD_DB_IDENTIFIER = "guilds";
export const SEND_CACHE_IDENTIFIER = "cat_sendCache";
export const CATBOT_STATS_IDENTIFIER = "cat_stats";

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
        if (!db.has(PICTURES_IDENTIFIER).value()) {
            db.defaults({
                cat_pictures: [],
                guilds: [],
                cat_sendCache: [],
                cat_stats: {}
            }).write();
        }
        this.db = db;
    }

    public getCustomDbService(func: (db: lowdb.LowdbAsync<DbSchema>) => GenericDbService ): GenericDbService {
        return func(this.db);
    }

    public getGuildList() : string[] {
        return this.db.get(GUILD_DB_IDENTIFIER).value();
    }
}
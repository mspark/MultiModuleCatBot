import { METHODS } from "http";
import lowdb from "lowdb";
import { default as FileAsync } from "lowdb/adapters/FileAsync";
import { CatBotStatistics, PictureCacheModel, SendPicturesModel } from "./CatBot";
 
export interface DbSchema {
    guilds: string[],
    pictures: PictureCacheModel[],
    sendCache: SendPicturesModel[],
    catbot_stats: CatBotStatistics
}

export class GenericDbService {}

export const PICTURES_IDENTIFIER = "pictures";
export const GUILD_DB_IDENTIFIER = "guilds";
export const SEND_CACHE_IDENTIFIER = "sendCache";
export const CATBOT_STATS_IDENTIFIER = "catbot_stats";

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
                pictures: [],
                guilds: [],
                sendCache: [],
                catbot_stats: {}
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
import { Client, Collection, Guild, Message, MessageEmbed } from "discord.js";
import Lowdb from "lowdb";
import { DbSchema, GUILD_DB_IDENTIFIER } from "../database/DbSchema";
import { DbService, GenericDbService } from "../database/DbService";
import { Module } from "../core/GenericModule";
import { GuildSchema } from "./types";

export class GuildManagementDbService extends GenericDbService {

    constructor(private db: Lowdb.LowdbAsync<DbSchema>) {
        super();
    }

    getGuildList(): string[] {
        const values =  this.db
            .get(GUILD_DB_IDENTIFIER)
            .value();
        return values?.map(a => a.guildId) ?? [];
    }

    addGuild(guild: GuildSchema): void {
        this.db
            .get(GUILD_DB_IDENTIFIER)
            .push(guild)
            .write();
    }

    getGuild(gid: string): GuildSchema | undefined{
        return this.db
            .get(GUILD_DB_IDENTIFIER)
            .find({guildId: gid})
            .value();
    }

    removeGuild(gid: string): void {
        this.db
            .get(GUILD_DB_IDENTIFIER)
            .remove(a => a.guildId === gid)
            .write();
    }
    
    setState(gid: string, acitivtyState: boolean): void {
        this.db.get(GUILD_DB_IDENTIFIER)
            .find({guildId: gid})
            .assign({isActive: acitivtyState})
            .write();
    }

    updateLastCommand(gid: string): void {
        this.db.get(GUILD_DB_IDENTIFIER)
            .find({guildId: gid})
            .assign({lastAction: new Date()})
            .write();
    }

}

export class GuildManagementModule extends Module {
    private customDbService: GuildManagementDbService;

    constructor(dbService: DbService) {
        super();
        this.customDbService = dbService.getCustomDbService(db => new GuildManagementDbService(db)) as GuildManagementDbService;
    }

    public moduleName(): string {
        return "guild";
    }

    public helpPage(): MessageEmbed {
        throw new Error("Method not implemented.");
    }

    public sendStats(message: Message): void {
        const embed = new MessageEmbed()
            .setColor('#450000')
            .setTitle("server statistics")
            .setDescription('Total amount of servers: ' + this.customDbService.getGuildList().length);
        message.channel.send(embed);
    }
    
    public registerActions(client: Client): void {
        client.on("message", (message: Message) => {
            super.saveRun(async () => {
                if (message.guild)  {
                    this.customDbService.updateLastCommand(message.guild.id);
                }
            });
        });
        client.on("ready", () => {
            const guilds = client.guilds.cache;
            new GuildRefresher(guilds, this.customDbService)
                .addMissingToDb()
                .setGuildsToInactive()
                .logNumber();
        });
        client.on("guildDelete", (guild: Guild) => {
            this.customDbService.setState(guild.id, false);
        });
    }
}

class GuildRefresher {
    constructor(private guilds: Collection<string, Guild>, private customDbService: GuildManagementDbService) {}

    addMissingToDb(): GuildRefresher {
        this.guilds.forEach((guild: Guild, gid: string) => {
            if (this.customDbService.getGuildList().includes(gid)) {
                this.customDbService.setState(gid, true);
            } else {
                this.customDbService.addGuild({
                    guildId: gid,
                    isActive: true,
                    guildName: this.guilds.get(gid)?.name ?? "unknown",
                    lastAction: new Date()
                });
            }
        });
        return this;
    }

    setGuildsToInactive(): GuildRefresher {
        this.customDbService
            .getGuildList()
            .filter(e => !this.guilds.has(e))
            .forEach(e => this.customDbService.setState(e, false));
        return this;
    }

    logNumber(): GuildRefresher {
        console.log(`Bot is running on ${this.guilds.size} servers.`);
        return this;
    }
}
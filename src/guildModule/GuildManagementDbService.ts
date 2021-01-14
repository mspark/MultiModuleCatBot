/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import Lowdb from "lowdb";
import { DbSchema, GUILD_DB_IDENTIFIER } from "../database/DbSchema";
import GenericDbService from "../database/GenericDbService";
import { GuildSchema } from "./types";

export default class GuildManagementDbService extends GenericDbService {
  constructor(private db: Lowdb.LowdbAsync<DbSchema>) {
    super();
  }

  getGuildList(): string[] {
    return this.db
      .get(GUILD_DB_IDENTIFIER)
      .value()
      ?.map((a) => a.guildId) ?? [];
  }

  addGuild(guild: GuildSchema): void {
    this.db
      .get(GUILD_DB_IDENTIFIER)
      .push(guild)
      .write();
  }

  getGuild(gid: string): GuildSchema | undefined {
    return this.db
      .get(GUILD_DB_IDENTIFIER)
      .find({ guildId: gid })
      .value();
  }

  removeGuild(gid: string): void {
    this.db
      .get(GUILD_DB_IDENTIFIER)
      .remove((a) => a.guildId === gid)
      .write();
  }

  setState(gid: string, acitivtyState: boolean): void {
    this.db.get(GUILD_DB_IDENTIFIER)
      .find({ guildId: gid })
      .assign({ isActive: acitivtyState })
      .write();
  }

  updateLastCommand(gid: string): void {
    this.db.get(GUILD_DB_IDENTIFIER)
      .find({ guildId: gid })
      .assign({ lastAction: new Date() })
      .write();
  }
}

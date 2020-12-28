/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
import Lowdb from "lowdb";
import { DbSchema, GUILD_DB_IDENTIFIER } from "../database/DbSchema";
import GenericDbService from "../database/GenericDbService";
import { GuildSchema } from "./types";

export default class GuildManagementDbService extends GenericDbService {
  // eslint-disable-next-line no-unused-vars
  constructor(private db: Lowdb.LowdbAsync<DbSchema>) {
    super();
  }

  getGuildList(): string[] {
    const values = this.db
      .get(GUILD_DB_IDENTIFIER)
      .value();
    return values?.map((a) => a.guildId) ?? [];
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

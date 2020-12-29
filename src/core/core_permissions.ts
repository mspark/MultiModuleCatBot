/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Message } from "discord.js";
import { Utils } from "../Utils";

export enum Perm {
    EVERYONE,
    GUILD_ADMIN,
    BOT_ADMIN,
}

export class CmdActionAsync {
    private neededPerms: Perm[];

    constructor(private action: (message: Message) => Promise<void>) {
      this.neededPerms = [Perm.EVERYONE];
    }

    public setNeededPermission(perms: Perm[]): CmdActionAsync {
      this.neededPerms = perms;
      return this;
    }

    public setAction(func: (message: Message) => Promise<void>): CmdActionAsync {
      this.action = func;
      return this;
    }

    public async invoke(message: Message, actualPermission: Perm[]): Promise<void> {
      if (actualPermission.length === 0) {
        actualPermission.push(Perm.EVERYONE);
      }
      const matches = this.neededPerms
        .map((p) => actualPermission.includes(p))
        .reduce((a, b) => a && b);
      if (matches) {
        return this.action(message);
      }
      return new Promise(() => message.reply("Not enough permission to do this"));
    }

    public async invokeWithAutoPermissions(message: Message): Promise<void> {
      const perm = [Perm.EVERYONE];
      if (Utils.isBotAdmin(message.author.id)) {
        perm.push(Perm.BOT_ADMIN);
      }
      await this.invoke(message, perm);
    }
}

/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Message } from "discord.js";
import { Utils } from "../Utils";
import { Perm } from "./types";

export default class CmdActionAsync {
    private neededPerms: Perm[];

    private privateMessageAllowed = true;

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

    public setToGuildOnly(): CmdActionAsync {
      this.privateMessageAllowed = false;
      return this;
    }

    public async invoke(message: Message, actualPermission: Perm[]): Promise<void> {
      let replyErrorMesasge = "";
      if (this.isMessageScopeAllowed(message)) {
        if (this.checkPermission(actualPermission)) {
          return this.action(message);
        }
        replyErrorMesasge = "Not enough permission to do this";
      } else {
        replyErrorMesasge = "This command is not available in this message scope.";
      }
      return new Promise(() => message.reply(replyErrorMesasge));
    }

    private checkPermission(actualPermission: Perm[]): boolean {
      if (actualPermission.length === 0) {
        actualPermission.push(Perm.EVERYONE);
      }
      return this.neededPerms
        .map((p) => actualPermission.includes(p))
        .reduce((a, b) => a && b);
    }

    public async invokeWithAutoPermissions(message: Message): Promise<void> {
      const perm = [Perm.EVERYONE];
      if (Utils.isBotAdmin(message.author.id)) {
        perm.push(Perm.BOT_ADMIN);
      }
      await this.invoke(message, perm);
    }

    public isMessageScopeAllowed(message: Message) : boolean {
      return this.privateMessageAllowed || !!message.guild;
    }
}

import { Message } from "discord.js";
import { Utils } from "../globals_utils";

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
        let matches = true;
        actualPermission = actualPermission ?? [Perm.EVERYONE];
        this.neededPerms.forEach(p => matches = matches && actualPermission.includes(p));
        if (matches) {
            await this.action(message);
        } else {
            message.reply("Not enough permission to do this");
        }
    }

    public async invokeWithAutoPermissions(message: Message): Promise<void> {
        let perm = [Perm.EVERYONE];
        if (Utils.isBotAdmin(message.author.id)) {
            perm.push(Perm.BOT_ADMIN);
        }
        await this.invoke(message, perm);
    }
}
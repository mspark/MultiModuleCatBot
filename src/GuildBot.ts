import { Client, Message } from "discord.js";
import { DbService, GenericDbService } from "./dbservice";
import { GenericBot } from "./GenericBot";

export class GuildManagementBot extends GenericBot {
    helpPage(): String {
        throw new Error("Method not implemented.");
    }
    statisticName(): String {
        return "guild";
    }
    
    constructor(private dbService: DbService) {
        super();
    }

    registerActions(client: Client): void {
        client.on('message', async (msg: Message) => {
			if (super.isCmdAllowed(msg.content)) {
                const content  = super.getCmd(msg.content);
                if (content == "guilds" ) {
                    msg.reply(this.dbService.getGuildList());
                }
			}
		});
    }
}
// import { Client, Message } from "discord.js";
// import { DbService, GenericDbService } from "./dbservice";
// import { Module } from "./GenericModule";

// export class GuildManagementModule extends Module {
//     sendStats(): void {
//         throw new Error("Method not implemented.");
//     }
// 	helpPage(message: Message): String {
//         throw new Error("Method not implemented.");
//     }
//     moduleName(): String {
//         return "guild";
//     }
    
//     constructor(private dbService: DbService) {
//         super();
//     }

//     registerActions(client: Client): void {
//         client.on('message', async (msg: Message) => {
// 			if (super.isCmdAllowed(msg.content)) {
//                 const content  = super.getCmd(msg.content);
//                 if (content == "guilds" ) {
//                     msg.reply(this.dbService.getGuildList());
//                 }
// 			}
// 		});
//     }
// }
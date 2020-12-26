import { Client, Message, MessageEmbed } from "discord.js";
import { isElementAccessChain } from "typescript";
import { getModuleList } from "./ModuleList";
import { CatModule } from "./CatModule";
import { DbService } from "./DbService";
import { Module, PREFIX, STATS_PREFIX } from "./GenericModule";
require('dotenv').config();

export interface Config {
	apiToken: string
	botAdminList?: string[]
	catPicturesPath?: string
}

export const CONFIG = {
	apiToken: process.env.API_TOKEN,
	botAdminList: process.env.BOT_ADMINS?.split(","),
	catPicturesPath: process.env.PICTURE_DIR_PATH
}


class CoreModule extends Module {

	constructor(private allBots: Module[]) {
		super();
	}

	public sendStats(message: Message): void {
		const embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle("Help Page")
			.setDescription('Specify the module stats you want. Do this with: \`!stats <module>\`')
			.addField('Available Modules', this.moduleNamesConcat());
		message.channel.send(embed);
	}
	
	public helpPage(): MessageEmbed {
		return new MessageEmbed()
			.setColor('#0099ff')
			.setTitle("Help Page")
			.setDescription('Welcome to this multi module bot. Please call the respective help page of each module via \`!help <module>\`')
			.addField('Available Modules', this.moduleNamesConcat(), true);
	}

	public moduleName(): string {
		return ""; // just the prefix
	}
	
	// Place for global actions which no module has to implement by its own
	public registerActions(client: Client): void {
		client.on('message', async (msg: Message) => {
			const cmd = super.cmdFilter(msg.content);
			if (cmd == "id") {
				msg.reply("Your discord id: " + msg.author.id); 
			}
			if (cmd == "invite") {
				msg.channel.send("TODO");
			}
		});
	}

	private moduleNamesConcat(): string {
		return this.allBots.map(e => e.moduleName()).join("\n");
	}
}

async function run() {
	const modules = await getModuleList();
	modules.push(new CoreModule(modules.slice())); // use copy without CoreModule to avoid recursion
	console.log(`Starting bot with ${modules.length} modules loaded`);
	
	const client: Client = new Client();
	client.on('ready', () => {
		console.log(`Logged in as ${client.user!.tag}!`);
	});
	client.on("disconnect", function(event){
		console.log(`The WebSocket has closed and will no longer attempt to reconnect`);
	});

	modules.forEach(app => {
		app.registerBasicCommands(client);
		app.registerActions(client);
	});
	client.login(process.env.API_TOKEN);
}
run();
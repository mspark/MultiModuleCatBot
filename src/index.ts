import { Client, Message } from "discord.js";
import { isElementAccessChain } from "typescript";
import { getModuleList } from "./BotList";
import { CatBot } from "./CatBot";
import { DbService } from "./dbservice";
import { Module, PREFIX, STATS_PREFIX } from "./GenericModule";
require('dotenv').config();

class ModuleDirector extends Module {
	
	constructor(private allBots: Module[]) {
		super();
	}

	public sendStats(message: Message): void {
		message.reply("Pls specify the status you want. Available: " + this.moduleNamesConcat());
	}
	
	public helpPage(): string {
		return "All available modules are: "+  this.moduleNamesConcat() + "\n Call them via " + PREFIX + "help <module>";
	}

	public moduleName(): string {
		return ""; // just the prefix
	}
	
	// Place for global actions which no module has to implement by its own
	public registerActions(client: Client): void {
		client.on('message', async (msg: Message) => {

		});
	}

	private moduleNamesConcat(): string {
		return "{" + this.allBots.map(e => e.moduleName()).join(", ") + "}";
	}
}

async function run() {
	const applicationBots = await getModuleList();
	applicationBots.push(new ModuleDirector(applicationBots.slice()));

	const client: Client = new Client();
	client.on('ready', () => {
		console.log(`Logged in as ${client.user!.tag}!`);
	});

	applicationBots.forEach(app => {
		app.registerBasicCommands(client);
		app.registerActions(client);
	});
	client.login(process.env.API_TOKEN);
}
run();
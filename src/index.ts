import { Client, Message } from "discord.js";
import { isElementAccessChain } from "typescript";
import { getModuleList } from "./ModuleList";
import { CatModule } from "./CatModule";
import { DbService } from "./DbService";
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
			const cmd = super.cmdFilter(msg.content);
		});
	}

	private moduleNamesConcat(): string {
		return "{" + this.allBots.map(e => e.moduleName()).join(", ") + "}";
	}
}

async function run() {
	const modules = await getModuleList();
	modules.push(new ModuleDirector(modules.slice())); // use copy without ModuleDirector himself
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
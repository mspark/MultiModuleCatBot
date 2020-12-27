import { Client, Message, MessageEmbed } from "discord.js";
import { getModuleList } from "./module_list";
import { Module } from "./GenericModule";
import { CoreModule } from "./core_module";
require('dotenv').config();

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
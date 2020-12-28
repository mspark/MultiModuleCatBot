import { Client } from "discord.js";
import { getModuleList } from "./module_list";
import { CoreModule } from "./core_module";

async function run() {
	const modules = await getModuleList();
	modules.push(new CoreModule(modules.slice())); // use copy without CoreModule to avoid recursion
	console.log(`Starting bot with ${modules.length} modules loaded`);
	
	const client: Client = new Client();
	modules.forEach(app => {
		app.registerBasicCommands(client);
		app.registerActions(client);
	});
	client.login(process.env.API_TOKEN);
}
run();
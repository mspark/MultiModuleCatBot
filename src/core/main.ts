/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Client } from "discord.js";
import CoreModule from "./CoreModule";
import getModuleList from "./module_list";

async function run() {
  const modules = await getModuleList();
  modules.push(new CoreModule(modules.slice())); // use copy without CoreModule to avoid recursion
  console.log(`Starting bot with ${modules.length} modules loaded`);

  const client: Client = new Client();
  modules.forEach((app) => {
    app.registerBasicCommands(client);
    app.registerActions(client);
  });
  client.login(process.env.API_TOKEN);
}
run();

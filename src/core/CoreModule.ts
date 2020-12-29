/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Client, Message, MessageEmbed } from "discord.js";
import Module from "./GenericModule";

const inviteLink = "https://discord.com/oauth2/authorize?client_id=791080285990682665&scope=bot&permissions=126016";

export default class CoreModule extends Module {
  constructor(private allBots: Module[]) {
    super();
  }

  public sendStats(message: Message): void {
    const embed = new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Help Page")
      .setDescription("Specify the module stats you want. Do this with: `!stats <module>`")
      .addField("Available Modules", this.moduleNamesConcat());
    message.channel.send(embed);
  }

  public helpPage(): MessageEmbed {
    return new MessageEmbed()
      .setColor("#0099ff")
      .setTitle("Help Page")
      .setDescription("Welcome to this multi module bot."
        + "Please call the respective help page of the desired module via `!help <module>`")
      .addField("Available Modules", this.moduleNamesConcat(), true);
  }

  // eslint-disable-next-line class-methods-use-this
  public moduleName(): string {
    return ""; // just the prefix
  }

  // Place for global actions which no module has to implement by its own
  // eslint-disable-next-line class-methods-use-this
  public registerActions(client: Client): void {
    client.on("message", (msg: Message) => CoreModule.actionOnMessage(msg));
    client.on("ready", () => console.log(`Logged in as ${client.user?.tag}!`));
    client.on("disconnect", () => console.log("The WebSocket has closed and will no longer attempt to reconnect"));
  }

  private moduleNamesConcat(): string {
    return this.allBots.map((e) => e.moduleName()).join("\n");
  }

  private static async actionOnMessage(msg: Message): Promise<void> {
    return Module.saveRun(async () => {
      const cmd = Module.cmdFilter(msg);
      if (cmd === "id") { msg.reply("Your discord id: \" + msg.author.id"); }
      if (cmd === "invite") { msg.channel.send(inviteLink); }
    });
  }
}

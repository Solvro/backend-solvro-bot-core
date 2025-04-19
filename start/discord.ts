import { client } from '#app/discord/index'
import userInfoCmd from '#app/discord/commands/utility/user'
client.commands.set(userInfoCmd.name(), userInfoCmd)
await client.start()

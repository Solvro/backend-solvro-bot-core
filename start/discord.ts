import { client } from '#app/discord/index'
import userInfoCmd from '#app/discord/commands/utility/user'
import recordCmd from '#app/discord/commands/transcriber/record'

client.commands.set(userInfoCmd.name(), userInfoCmd)
client.commands.set(recordCmd.name(), recordCmd)
await client.start()

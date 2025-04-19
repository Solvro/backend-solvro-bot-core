import { client } from '#app/discord/index'
import { commands } from '#app/discord/index'

commands.forEach((command) => {
  console.info(`Command: ${command.name()}`)
  client.commands.set(command.name(), command)
})

await client.start()

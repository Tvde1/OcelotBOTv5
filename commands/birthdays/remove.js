/**
 *   ╔════   Copyright 2019 Peter Maguire
 *  ║ ════╗  Created 02/10/2019
 * ╚════ ║   (ocelotbotv5) remove
 *  ════╝
 */
module.exports = {
    name: "Remove Birthday",
    usage: "remove <user>",
    commands: ["remove", "delete"],
    run: async function (message, args, bot) {
        let target = message.author;
        if(message.member.hasPermission("MANAGE_CHANNELS")) {
            if (message.mentions.users.size > 0)
                target = message.mentions.users.first();
            else if (args.length > 2) {
                let allBirthdays = await bot.database.getBirthdays(message.guild.id);
                let found = false;
                const search = args.slice(2).join(" ").toLowerCase();
                for (let i = 0; i < allBirthdays.length; i++) {
                    let user = await bot.util.getUserInfo(allBirthdays[i].user);
                    if (!user) continue;
                    if (user.username.toLowerCase().includes(search)) {
                        found = true;
                        target = user;
                        break;
                    }
                }
                if (!found) {
                    return message.channel.send("Couldn't find user, @ them or try a different search");
                }
            }
        }else if(args.length > 2){
            return message.channel.send("You must have the Manage Channels permission to remove other people's birthdays.")
        }
        await bot.database.removeBirthday(target.id, message.guild.id);
        return message.replyLang("BIRTHDAY_REMOVE_SUCCESS", {user: target});
    }
};
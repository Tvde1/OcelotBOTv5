/**
 *   ╔════   Copyright 2019 Peter Maguire
 *  ║ ════╗  Created 07/09/2019
 * ╚════ ║   (ocelotbotv5) list
 *  ════╝
 */
const columnify = require('columnify');
module.exports = {
    name: "List Birthdays",
    usage: "list",
    commands: ["list", "view"],
    run: async function(message, args, bot){
        let birthdays = await bot.database.getBirthdays(message.guild.id);
        if(birthdays.length === 0)
            return message.channel.send(`:tada: No birthdays setup for this server! To add a birthday, type ${args[0]} add @user date`);

        const now = new Date();
        let formatted = [];
        for(let i = 0; i < birthdays.length; i++){
            const birthday = birthdays[i];
            let user = await bot.util.getUserInfo(birthday.user);
            let d = birthday.birthday; //Yes
            console.log(d-now);
            if(d <= now)
                d.setYear(now.getFullYear()+1);

            console.log(d);

            let days = Math.floor((d-now)/8.64e+7);
            if(days === 365)
                days = "🎉 Today!";
            else
                days = days + " Day"+(days !== 1 ? "s":"");
            formatted.push({
                "user ::": (user ? user.username+"#"+user.discriminator : "Unknown User "+birthday.user)+" ::",
                birthday: `${bot.util.getNumberPrefix(d.getDate())} of ${bot.util.months[d.getMonth()]}`,
                in: days
            });
        }
        message.channel.send("```asciidoc\n"+columnify(formatted)+"\n```");
    }
};
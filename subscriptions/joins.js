/**
 *   ╔════   Copyright 2019 Peter Maguire
 *  ║ ════╗  Created 10/05/2019
 * ╚════ ║   (ocelotbotv5) joins
 *  ════╝
 */
module.exports = {
    name: "Server Joins",
    id: "joins",
    alias: ["serverjoins"],
    validate: function(data){
        return {data};
    },
    added: async function added(sub, bot){
        let message = sub.data ? sub.data : "{{user}}, welcome to {{server}}.";
        let channel = await bot.client.channels.fetch(sub.channel);
        bot.client.on("guildMemberAdd", function(guildMember) {
            if(guildMember.guild.id === sub.server){
                channel.send(message.formatUnicorn({
                    user: guildMember.user,
                    username: guildMember.user.username,
                    server: guildMember.guild.name,
                    userCount: guildMember.guild.members.size
                }));
            }
        });
    }
};

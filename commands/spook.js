const Discord = require('discord.js');
const end = new Date("1 November 2019");
const start = new Date("1 October 2019");
const teaserStart = new Date("29 August 2019");
module.exports = {
    name: "Spook",
    usage: "spook <user>",
    categories: ["fun"],
    requiredPermissions: [],
    commands: ["spook", "spooked"],
    init: async function(bot){

        function setTeaserMessage(){
            bot.logger.log("Updating teaser message");
            const days = Math.round((start-new Date())/86400000);
            bot.presenceMessage = `👻 ${days} DAYS`;
            setInterval(setTeaserMessage, 86400000)
        }

        bot.client.on("ready", async function ready(){
            const now = new Date();
            const teaserDiff = teaserStart-now;
            const startDiff = start-now;
            if(startDiff <= 0) {
                bot.updatePresence = async function(){
                    const now = new Date();
                    if(now-bot.lastPresenceUpdate>100000) {
                        bot.lastPresenceUpdate = now;
                        const result = await bot.database.getSpookedServers();
                        bot.client.user.setPresence({
                            game: {
                                name: `👻 !spook ~ ${result.total[0]['COUNT(*)'].toLocaleString()} SPOOKED.`,
                                type: "WATCHING"
                            }
                        });
                    }
                };
            } else if(teaserDiff <= 0){
                bot.logger.log("Spook teaser time");
                setTeaserMessage();
            }else{
                bot.logger.log("Teaser in "+teaserDiff+"ms");
                bot.util.setLongTimeout(setTeaserMessage, teaserDiff);
            }
        });

        bot.spook = {};
        bot.spook.spooked = [];


        bot.client.on("message", function spookTimeout(message){
            if(!message.guild)return;
            if(!bot.spook.spooked[message.guild.id])return;

            clearTimeout(bot.spook.spooked[message.guild.id].timer);
            bot.spook.spooked[message.guild.id].timer = setTimeout(bot.spook.generateNew, 8.64e+7, message.guild.id);
        });

        bot.client.on("guildMemberRemove", function spookLeaveCheck(member){
            if(!bot.spook.spooked[member.guild.id])return;
            if(bot.spook.spooked[member.guild.id].user !== member.id)return;
            bot.logger.log("Spooked user left, generating new...");
            bot.spook.generateNew(member.guild.id);
        });

        bot.spook.getSpookChannel = async function getLastSpookChannel(server){
            let spooked = await bot.database.getSpooked(server);
            if(!spooked || !spooked[0])
                return bot.util.determineMainChannel(bot.client.guilds.get(server));

            return bot.client.channels.get(spooked[0].channel)
        };



        bot.spook.giveSpecialRoles = async function giveSpecialRoles(channel){
            //This line is pornographic
            const eligibleUsers = [...new Set((await bot.util.fetchMessages(channel, 100)).filter((m)=>!m.author.bot).map((m)=>m.author))];
            const specialRoles = await bot.database.getSpookRoles();

            let giving = true;
            let passes = 0;
            let userIndex = 0;
            bot.util.shuffle(eligibleUsers);
            console.log(eligibleUsers.length);
            let passMultiplier = 1;
            while(giving) {
                passes++;
                console.log("Pass "+passes+" UI "+userIndex);
                for (let i = 0; i < specialRoles.length; i++) {
                    const role = specialRoles[i];
                    const user = eligibleUsers[userIndex++];
                    giving = false;
                    if (user) {
                        if(role.rate <= (passes * passMultiplier)) {
                            bot.spook.assignRole(user, role);
                            giving = true;
                        }
                    } else
                        break;
                }
            }
        };

        bot.spook.superSecretFunction = bot.spook.giveSpecialRoles;


        bot.spook.assignRole = function assignRole(user, role){
            console.log("Assigning "+user.username+" "+role.name);
        };

        bot.spook.checkSpecialRoles = function checkSpecialRoles(){

        };

        bot.spook.getColour = function getColour(guild, user){
            if(!guild.members.has(user.id))
                return "#ffffff";
            let hoistRole = guild.members.get(user.id).hoistRole;
            if(!hoistRole)
                return "#ffffff";

            return hoistRole.hexColor;
        };

        bot.spook.createSpook  = async function spook(channel, spooker, spooked){
            await bot.database.spook(
                spooked.id,
                spooker.id,
                channel.guild.id,
                spooker.username,
                spooked.username,
                bot.spook.getColour(channel.guild, spooker),
                bot.spook.getColour(channel.guild, spooked));
            bot.updatePresence();
            bot.spook.checkSpecialRoles();
            if (bot.spook.spooked[channel.guild.id])
                clearTimeout(bot.spooked[channel.guild.id].timer);
            bot.spook.spooked[message.guild.id] = {
                user: spooked.id,
                timer: setTimeout(bot.spook.generateNew, 8.64e+7, channel.guild.id) //24 Hours
            };
        };

        bot.spook.generateNew = async function generateNew(server){
            if(!bot.client.guilds.has("server")) //No longer exists
                return bot.logger.warn("Spooked guild no longer exists");

            const guild = bot.client.guilds.get(server);
            const lastSpooked = bot.database.getSpooked(server)[0].spooked;
            const left = guild.users.has(lastSpooked);
            const channel = bot.spook.getSpookChannel(server);
            const lastMessages = (await channel.fetchMessages({limit: 50})).filter(function(message){
                return !message.author.bot && message.guild.members.has(message.author.id) && message.author.id !== lastSpooked;
            });
            let targetUser;
            if(lastMessages.size === 1){
                bot.logger.warn("No eligible users found...");
                targetUser = guild.users.filter((u)=>!u.bot).random(1)[0];
            }else
                targetUser = lastMessages.random(1)[0].author;

            bot.logger.log("Spooking new user "+targetUser);
            await bot.spook.createSpook(channel, lastSpooked, targetUser.id);
            channel.replyLang(left ? "SPOOK_USER_LEFT" : "SPOOK_USER_IDLE", {old: lastSpooked, spooked: targetUser});
        };


        bot.doSpookEnd = async function doSpookEnd(){
            // const now = new Date();
            //
            // bot.logger.warn("***TRIGGERING SPOOK END***");
            //
            // bot.logger.log("Notifying Servers...");
            // const servers = await bot.database.getParticipatingServers();
            // for(let i = 0; i < servers.length; i++){
            //     const server = servers[i];
            //     if(bot.client.guilds.has(server.server)){
            //         bot.sendSpookEnd(server.server);
            //     }
            // }


            bot.logger.log("Allocating Badges...");
            const users = await bot.database.getParticipatingUsers();
            for(let j = 0; j < users.length; j++) {
                const userRow = users[j];
                if (!await bot.database.hasBadge(userRow.spooker, 2)) {
                    bot.logger.log("Given spook participant badge to "+userRow.spooker);
                    await bot.database.giveBadge(userRow.spooker, 2);
                }

                if (userRow.spooker !== userRow.spooked && !await bot.database.hasBadge(userRow.spooked, 2)) {
                    bot.logger.log("Given spook participant badge to "+userRow.spooked);
                    await bot.database.giveBadge(userRow.spooked, 2);
                }
            }

            // bot.logger.log("Setting the presence...");
            // const serverCount  = (await bot.client.shard.fetchClientValues("guilds.size")).reduce((prev, val) => prev + val, 0);
            // bot.presenceMessage = "Thank you for playing!";
            // bot.client.user.setPresence({
            //     game: {
            //         name: `Thank you for playing! | ${serverCount} servers.`,
            //         type: "LISTENING"
            //     }
            // });
            //
            //


        };

        bot.sendSpookEnd = async function sendSpookSend(id, channel){
            if(!bot.client.guilds.has(id))return;
            const server = bot.client.guilds.get(id);
            const spooked = await bot.database.getSpooked(id);
            if(!spooked[0]){
                bot.logger.warn(`${server.name} (${server.id}) didn't participate in the spooking.`);
            }else {
                const loser = spooked[0].spooked;
                bot.logger.log(`Sending spook end for ${server.name} (${server.id})`);
                let eligibleChannels;
                if (!channel) {
                    eligibleChannels = server.channels.filter(function (channel) {
                        return channel.permissionsFor(bot.client.user).has("SEND_MESSAGES");
                    });
                }
                const targetChannel = channel || eligibleChannels.first();
                bot.logger.log(`Target channel for ${server.name} (${server.id}) is ${targetChannel.name} (${targetChannel.id})`);

                const spookStats = await bot.database.getSpookStats(id);

                let embed = new Discord.RichEmbed();
                embed.setColor(0xd04109);
                embed.setTitle("The Spooking Has Ended.");
                embed.setTimestamp(new Date());
                embed.setFooter("Happy Halloween!", "https://cdn.discordapp.com/avatars/146293573422284800/a3ba7bf8004a9446239e0113b449a30c.png?size=128");
                embed.setDescription(`Thank you all for participating.\n**<@${loser}> is the loser!**\nIf you enjoyed this halloween event please consider [voting for OcelotBOT](https://discordbots.org/bot/146293573422284800/vote).`);
                embed.addField("Total Spooks", spookStats.totalSpooks, true);
                embed.addField("Most Spooked User", `<@${spookStats.mostSpooked.spooked}> (${spookStats.mostSpooked['COUNT(*)']} times)`, true);
                embed.addField("Longest Spook", `<@${spookStats.longestSpook.spooked}> (Spooked for ${bot.util.prettySeconds(spookStats.longestSpook.diff)})`);
                embed.addField("Spook Graph", "Below is a graph of all the spooks on this server.\nOr click [here](https://ocelot.xyz/graph.png) for a graph of all the spooks across all servers.");
                embed.setImage("http://ocelot.xyz/graph.php?server="+id+"&end=true");
                targetChannel.send("", embed);


                if(!await bot.database.hasBadge(loser, 1))
                    await bot.database.giveBadge(loser, 1);
            }
        };




    },
    run: async function(message, args, bot){
        if(!message.guild)
            return message.replyLang("GENERIC_DM_CHANNEL");

        const now = new Date();
        if(start-now > 0)
            return message.replyLang("SPOOK_TEASER", {time: bot.util.prettySeconds((start-now)/1000)});

        if(end-now <= 0)
            return bot.sendSpookEnd(message.guild.id, message.channel);

        if(args.length > 1){
           const canSpook = await bot.database.canSpook(message.author.id, message.guild.id);
            if (!canSpook)
                return message.replyLang("SPOOK_UNABLE");

            if(message.content.indexOf("@everyone") > -1 || message.content.indexOf("@here") > -1)
                return message.replyLang("SPOOK_EVERYONE");

            if (!message.mentions || !message.mentions.users || message.mentions.users.size === 0)
                return message.replyLang("SPOOK_MENTION");

            if(message.mentions.users.size > 1)
                return message.replyLang("SPOOK_MULTIPLE");

            if(message.mentions.users.first().bot)
                return message.replyLang("SPOOK_BOT");

            if(message.mentions.users.first().presence.status === "offline")
                return message.replyLang("SPOOK_OFFLINE");

            const target = message.mentions.users.first();

            if(target.id === message.author.id)
                return message.replyLang("SPOOK_SELF");
            const result = await bot.database.getSpookCount(target.id, message.guild.id);
            message.replyLang("spook", {
                count: bot.util.getNumberPrefix(result[0]['COUNT(*)'] + 1),
                spooked: target.id
            });
            await bot.spook.createSpook(message.channel, message.author, target);
        }else{
            const now = new Date();
            const result = await bot.database.getSpooked(message.guild.id);
            if(result[0])
                return message.replyLang("SPOOK_CURRENT", {spooked: result[0].spook, time: bot.util.prettySeconds((end-now)/1000)});
            message.replyLang("SPOOK_NOBODY");
        }
    }
};
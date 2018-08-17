const SourceQuery = require('sourcequery');
const config = require('config').get("Commands.serverinfo");
const sq = new SourceQuery(1000);
const Discord = require('discord.js');
module.exports = {
    name: "Source Server Info",
    usage: "serverinfo <ip:port>",
    requiredPermissions: ["EMBED_LINKS"],
    commands: ["serverinfo", "si"],
    categories: ["tools"],
    run:  function(message, args, bot){
        if(message.guild.id === "318432654880014347")return;

        if(args.length < 2){
            message.channel.send(":bangbang: Invalid usage: `!serverinfo ip:port`");
        }else{
            const preset = config.get("presets")[args[1].toLowerCase()];
            const gameColours = config.get("gameColours");
            let ip = args[1];
            let port = 27015;

            if(preset){
                ip = preset[0];
                port = preset[1];
            }

            if(ip.indexOf(":") > -1){
                const split = ip.split(":");
                ip = split[0];
                port = split[1];
            }else if(args[2]){
                port = args[2];
            }

            message.channel.startTyping();
            sq.open(ip, port);
            sq.getInfo(function sourceQueryInfo(err, info){
                bot.logger.log("Retrieved server info for "+args[1]);
                if(err){
                    message.channel.send(":warning: Error retrieving server information: "+err);
                }else{
                    sq.getPlayers(async function sourceQueryPlayers(err, players){
                        let output = ".";
                        for(let i in players){
                            output += players[i].name + "\n";
                            if(i > 10){
                                output += `...and ${players.length-i} more`;
                                break;
                            }
                        }

                        let embed = new Discord.RichEmbed();

                        embed.setColor(gameColours[info.folder] || "#45a569");

                        embed.setTitle(info.name);
                        embed.addField(await bot.lang.getTranslation(message.guild.id, "SERVERINFO_PLAYERS"), `${info.bots}+${info.players}/${info.maxplayers}`, true);
                        embed.addField(await bot.lang.getTranslation(message.guild.id, "SERVERINFO_MAP"), info.map, true);
                        embed.addField(await bot.lang.getTranslation(message.guild.id, "SERVERINFO_GAMEMODE"), info.game, true);
                        embed.addField(await bot.lang.getTranslation(message.guild.id, "SERVERINFO_VERSION"), info.version, true);
                        embed.addField(await bot.lang.getTranslation(message.guild.id, "SERVERINFO_PLAYERS"), output);
                        embed.setDescription(`steam://connect/${ip}:${port}`);

                        message.channel.send("", embed);

                        message.channel.stopTyping();
                        sq.close();
                    });
                }
            });
        }
    }
};
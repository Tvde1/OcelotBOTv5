/**
 *   ╔════   Copyright 2019 Peter Maguire
 *  ║ ════╗  Created 31/08/2019
 * ╚════ ║   (ocelotbotv5) lavaqueue
 *  ════╝
 */
const config = require('config');
const request = require('request');
const dns = require('dns');
const {Manager} = require('@lavacord/discord.js');
module.exports = {
    name: "LavaQueue",
    init: function (bot) {
        let firstReady = true;
        bot.client.on("ready", async function(){
            if(firstReady) {
                firstReady = false;
                const resumeKey = bot.client.user.id + "-" + bot.util.shard;
                let options =  {
                    resumeKey,
                    resumeTimeout: 60
                }

                const clients = [
                    {
                        id: "1",
                        host: "lavalink-1.ocelotbot.xyz",
                        port: 2333,
                        password: config.get("Lavalink.password"),
                        reconnectInterval: 1000,
                    },
                    {
                        id: "2",
                        host: "lavalink-2.ocelotbot.xyz",
                        port: 80,
                        password: config.get("Lavalink.password"),
                        reconnectInterval: 1000,
                    },
                    {
                        id: "guess",
                        host: "lavalink-3.ocelotbot.xyz",
                        port: 80,
                        password: config.get("Lavalink.password"),
                        reconnectInterval: 1000,
                    }
                ];



                bot.lavaqueue.manager = new Manager(bot.client, clients, {
                    user: bot.client.user.id
                });

                await bot.lavaqueue.updateDockerContainers();

                try {
                    bot.logger.log("Connecting...");
                    await bot.lavaqueue.manager.connect();
                    bot.logger.log("Connected!");

                }catch(e){
                    bot.logger.log("Connect error!!!!");
                    bot.logger.log(e);
                }
                bot.lavaqueue.manager.on("error", function(node, error){
                    bot.logger.error("Node Error: ",error);
                });

                setInterval(()=>{
                    bot.lavaqueue.manager.players.forEach(function playerHarvest(player){
                        if(!player.playing){
                            bot.logger.log(`Cleaning up stale player ${player.id} (${player.timestamp})`)
                            bot.lavaqueue.manager.leave(player.id);
                            player.removeAllListeners();
                            player.destroy();
                        }
                    });
                    bot.lavaqueue.manager.nodes.forEach(async function nodeReconnect(node){
                        if(!node.connected){
                            bot.logger.log(`Attempting to connect node ${node.id}`);
                            try {
                                await node.connect();
                            }catch(e){
                                bot.logger.error(`Error connecting to node ${node.id}: ${e}`)
                            }
                        }
                    })

                    bot.lavaqueue.updateDockerContainers();
                }, 36000);
            }
        });

        bot.lavaqueue = {};
        bot.lavaqueue.getSongs = async function getSongs(search, player) {
            return new Promise(function(fulfill, reject){
                const params = new URLSearchParams();
                params.append("identifier", search);
                request({url: `http://${player.node.host}:${player.node.port}/loadtracks?${params.toString()}`,  headers: { Authorization: player.node.password } }, function(err, resp, body){
                    if(err)
                        return reject(err);
                    try {
                        let data = JSON.parse(body);
                        fulfill(data);
                    }catch(e){
                        reject(e);
                    }
                })
            });
        };

        bot.lavaqueue.getSong = async function getSong(search, player) {
           return (await bot.lavaqueue.getSongs(search, player)).tracks[0];
        };

        bot.lavaqueue.leaveTimeouts = [];
        bot.lavaqueue.requestLeave = function requestLeave(channel, source){
            bot.logger.log("Requested leave for "+channel.id);
            if(bot.lavaqueue.leaveTimeouts[channel.id])
                clearTimeout(bot.lavaqueue.leaveTimeouts[channel.id]);
            bot.tasks.endTask("voiceChannel", channel.id);
            bot.lavaqueue.leaveTimeouts[channel.id] = setTimeout(async function leaveVoiceChannel(){
                bot.logger.info("Leaving voice channel "+channel.id+" due to "+source);
                if(channel.guild) {
                    await bot.lavaqueue.manager.leave(channel.guild.id);
                   // let player = bot.lavaqueue.manager.players.get(channel.guild.id);
                    //await player.destroy();

                    if(bot.music){
                        bot.music.deconstructListener(channel.guild.id);
                    }
                }else {
                    bot.logger.warn("Tried to leave undefined voice channel");
                    console.log(channel);
                }
            }, 60000);
        };
        bot.lavaqueue.cancelLeave = function cancelLeave(channel){
            if(bot.lavaqueue.leaveTimeouts[channel.id]) {
                bot.logger.info("Leave cancelled bot "+channel.id);
                clearTimeout(bot.lavaqueue.leaveTimeouts[channel.id]);
            }
        };

        bot.lavaqueue.playOneSong = async function playOneSong(voiceChannel, song, node = "1"){
           // if(voiceChannel.guild && voiceChannel.guild.id === "622757587489914880")
            //    song = "https://cdn.discordapp.com/attachments/626353784888754177/767805301260025896/websdr_recording_start_2020-10-19T17_41_42Z_7055.0kHz.wav";
            bot.lavaqueue.cancelLeave(voiceChannel);
            bot.tasks.startTask("playOneSong", voiceChannel.id);
            let span = bot.util.startSpan("Join Voice Channel", "voice");
            let player = await bot.lavaqueue.manager.join({
                guild: voiceChannel.guild.id,
                channel: voiceChannel.id,
                node,
            }, {selfdeaf: true});
            if(span)
                span.end();
            span = bot.util.startSpan("Get Song", "voice");
            let songData = await bot.lavaqueue.getSong(song, player);
            if(span)
                span.end();
            span = bot.util.startSpan("Play Song", "voice");
            player.play(songData.track);
            if(span)
                span.end();
            player.once("error", function playerError(error){
                bot.raven.captureException(error);
                bot.logger.error("Player Error: "+error.error); //YEs

            });
            player.once("event", data => {
                if (!data.reason || data.reason === "REPLACED") return; // Ignore REPLACED reason to prevent skip loops
                bot.tasks.endTask("playOneSong", voiceChannel.id);
                bot.logger.log("Song ended");
                bot.lavaqueue.requestLeave(voiceChannel, "player playOneSong Song ended");
            });
            return {songData, player};
        };

        bot.lavaqueue.updateDockerContainers = async function(){
            try{
                let dockerHosts = await dns.promises.resolve("tasks.ocelotbot-sat_lavalink", "A")

                bot.lavaqueue.manager.nodes.forEach((connectedNode)=>{
                    if(connectedNode.id.startsWith("docker-") && !dockerHosts.includes(connectedNode.id.split("-")[1])){
                        bot.logger.log(`Node ${connectedNode.id} doesn't exist anymore.`);
                        bot.lavaqueue.manager.removeNode(connectecdNode.id);
                    }
                })


                dockerHosts.forEach((host)=>{
                    if(!bot.lavaqueue.manager.nodes.has(`docker-${host}`)){
                        bot.logger.log(`Discovered new node docker-${host}`);
                        bot.lavaqueue.manager.createNode({
                            id: `docker-${host}`,
                            host,
                            port: 2333,
                            password: config.get("Lavalink.password"),
                            reconnectInterval: 1000,
                        })
                    }
                });
            }catch(e){
                if(e.code !== "ENOTFOUND")
                    console.error(e);
            }
        }
    }
};
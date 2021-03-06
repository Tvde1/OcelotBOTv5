module.exports = {
    name: "Ronald Says",
    usage: "ronald <text>",
    rateLimit: 10,
    requiredPermissions: ["ATTACH_FILES"],
    commands: ["ronald", "ronaldsays", "mcdonald"],
    categories: ["image", "fun", "memes"],
    unwholesome: true,
    run:  function(message, args, bot){
        if(!args[1]){
            message.replyLang("IMAGE_NO_TEXT");
            return;
        }
        let content = message.cleanContent.substring(args[0].length);
        return bot.util.imageProcessor(message, {
            "components": [
                {
                    "pos": {"x": 205, "y": 56, "w": 111, "h": 146},
                    "rot": 0.02548181,
                    "background": "#ffffff",
                    "filter": [{
                        name: "text",
                        args: {
                            font: "arial.ttf",
                            fontSize: content.length < 100 ? 20 : 10 ,
                            colour: "#000000",
                            content: content,
                            x: 5,
                            y: 5,
                            ax: 0,
                            ay: 0,
                            w: 101,
                            spacing: 1.1,
                            align: 0,
                        }
                    }]
                },
                {
                    "url": "ronald.png",
                    "local": true,
                    "pos": {"x": 0, "y": 0},
                    "rot": 0,
                    "filter": []
                }
            ],
            "width": 326,
            "height": 231
        }, "ronald")
    }
};
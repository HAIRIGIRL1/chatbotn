const config = {
    name: "data",
    permissions: [2],
    credits: "NJC",
    isAbsolute: true,
};

const langData = {
    en_US: {
        updateSuccess: "Updated data successfully. ({time}ms)",
        resetSuccess: "Reset data successfully.",
        chooseReset:
            "Choose what you want to reset:\n1. Threads\n2. Users\n3. All",
        threads: "All threads data will be reset.",
        users: "All users data will be reset.",
        all: "All data will be reset.",
        confirmReset: "\nReact 👍 to confirm.",
        invalidChoice: "Invalid choice.",
        invalidQuery: "Invalid query, available queries: update, reset.",
        error: "An error occurred.",
    },
};

async function resetConfirm({ message, eventData, getLang, xDB }) {
    const { reaction } = message;
    const { type, chosen } = eventData;

    if (reaction !== "👍") return;

    global.api.unsendMessage(message.messageID);

    try {
        if (chosen === "all") {
            global.data.users = new Map();
            global.data.threads = new Map();

            if (type === "MONGO") {
                await xDB.models.Users.deleteMany({});
                await xDB.models.Threads.deleteMany({});
            }
        } else {
            global.data[chosen] = new Map();

            if (type === "MONGO") {
                await xDB.models[
                    chosen.charAt(0).toUpperCase() + chosen.slice(1)
                ].deleteMany({});
            }
        }

        if (type === "JSON") {
            await xDB.update();
        }

        message.send(getLang("resetSuccess"));
    } catch (err) {
        console.error(err);
        message.send(getLang("error"));
    }
}

function chooseReset({ message, getLang }) {
    const { body, reply } = message;
    const choice = Number(body?.trim());

    if (isNaN(choice) || choice < 1 || choice > 3) {
        return reply(getLang("invalidChoice"));
    }

    const chosen = choice === 1 ? "threads" : choice === 2 ? "users" : "all";
    const type = global.config.DATABASE;

    reply(getLang(chosen) + getLang("confirmReset"))
        .then((_) => _.addReactEvent({ callback: resetConfirm, type, chosen }))
        .catch((err) => {
            console.error(err);
            reply(getLang("error"));
        });
}

async function onCall({ message, args, getLang, xDB }) {
    const query = args[0]?.toLowerCase();

    switch (query) {
        case "update": {
            try {
                await message.react("🕐");

                const start = Date.now();

                await xDB.update();

                await message.react("✅");

                await message.reply(
                    getLang("updateSuccess", {
                        time: Date.now() - start,
                    })
                );
            } catch (err) {
                console.error(err);
                await message.react("❌");
                await message.reply(getLang("error"));
            }
            break;
        }

        case "reset": {
            message
                .reply(getLang("chooseReset"))
                .then((_) => _.addReplyEvent({ callback: chooseReset }))
                .catch((err) => {
                    console.error(err);
                    message.reply(getLang("error"));
                });
            break;
        }

        default: {
            await message.reply(getLang("invalidQuery"));
        }
    }
}

export default {
    config,
    langData,
    onCall,
};

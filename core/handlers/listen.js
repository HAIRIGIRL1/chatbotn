import moment from "moment-timezone";
import handleEvents from "./events.js";
import { handleDatabase } from "./database.js";
import logger from "../var/modules/logger.js";

const eventlog_excluded = ["typ", "presence", "read_receipt"];

function handleEventLog(event) {
    const { LOG_LEVEL, timezone } = global.config;

    if (LOG_LEVEL === 0) return;
    if (eventlog_excluded.includes(event.type)) return;

    const { type, threadID, body, senderID } = event;

    if (LOG_LEVEL === 1) {
        const time = moment().tz(timezone).format("YYYY-MM-DD_HH:mm:ss");

        if (type === "message" || type === "message_reply") {
            logger.custom(
                `${threadID} • ${senderID} • ${body || "Media/Attachment"}`,
                time
            );
        }
    }

    if (LOG_LEVEL === 2) {
        console.log(event);
    }
}

export default async function handleListen(listenerID, xDatabase) {
    const {
        handleCommand,
        handleReaction,
        handleMessage,
        handleReply,
        handleUnsend,
        handleEvent,
    } = await handleEvents();

    return async (err, event) => {
        if (global.listenerID !== listenerID) return;

        if (err || !event) {
            logger.error(global.getLang?.("handlers.listen.accountError") || "Listen error");
            logger.error(err);
            process.exit(0);
        }

        if (
            global.maintain &&
            !global.config.MODERATORS?.includes(event.senderID || event.userID)
        ) return;

        if (global.config.ALLOW_INBOX !== true && event.isGroup === false) return;

        handleEventLog(event);

        if (!eventlog_excluded.includes(event.type)) {
            await handleDatabase(event);
        }

        switch (event.type) {
            case "message":
            case "message_reply":
                await handleMessage(event, xDatabase);
                await handleReply(event, xDatabase);
                await handleCommand(event, xDatabase);
                break;

            case "message_reaction":
                await handleReaction(event, xDatabase);
                break;

            case "message_unsend":
                handleUnsend(event);
                break;

            case "event":
            case "change_thread_image":
                handleEvent(event);
                break;

            default:
                break;
        }
    };
}

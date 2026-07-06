import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import axios from "axios";
import rateLimit from "express-rate-limit";
import { readFileSync } from "fs";

import logger from "../../var/modules/logger.js";
import { isReplit, isGlitch } from "../../var/modules/environments.get.js";

const commands = ["help", "version"];

const packageJson = JSON.parse(
    readFileSync(path.resolve("package.json"), "utf-8")
);

function startServer(serverAdminPassword) {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(express.json());
    app.use(cors());
    app.use(helmet());

    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
        })
    );

    app.use(express.static(path.resolve("core/dashboard/public")));

    // ⚠️ Auth middleware moved BEFORE protected routes
    app.use((req, res, next) => {
        if (req.path === "/" || req.path.startsWith("/core")) return next();

        if (req.headers["xva-access-token"] !== serverAdminPassword) {
            return res.status(401).send("Unauthorized");
        }

        next();
    });

    app.get("/", (req, res) => {
        res.sendFile(path.resolve("core/dashboard/public", "index.html"));
    });

    const commandHandlers = {
        help: () => ({ commands }),
        version: () => ({ version: packageJson.version }),
    };

    app.put("/commands", (req, res) => {
        const { command } = req.body;

        if (!command || !commands.includes(command)) {
            return res.status(400).send("Bad Request");
        }

        const handler = commandHandlers[command];
        if (!handler) return res.status(400).send("Bad Request");

        return res.status(200).json(handler());
    });

    global.server = app.listen(port, () => {
        logger.system(
            getLang("build.start.serverStarted", {
                port,
                serverAdminPassword,
            })
        );
    });

    // Auto ping logic (kept but cleaned)
    if (global.config.AUTO_PING_SERVER && (isReplit || isGlitch)) {
        logger.warn("AUTO PING IS NOT AVAILABLE");
    }
}

export default startServer;

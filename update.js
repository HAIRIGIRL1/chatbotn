/**
 * Update script (CLEANED + FIXED)
 * Original system: XaviaBot
 * Modified for: NJC Bot
 */

import axios from "axios";
import {
    copyFileSync,
    createWriteStream,
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    unlinkSync
} from "fs";

import { dirname, resolve } from "path";
import { createInterface } from "readline";
import logger from "./core/var/modules/logger.js";

const baseURL = "https://raw.githubusercontent.com/XaviaTeam/XaviaBot/";
const allVersionsURL =
    "https://raw.githubusercontent.com/XaviaTeam/XaviaBotUpdate/main/v-heads.json";

/* ---------------- SAFE DEEP MERGE ---------------- */
function deepAssign(target, source) {
    for (const key in source) {
        if (typeof source[key] === "object" && source[key] !== null) {
            if (typeof target[key] === "object") {
                deepAssign(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        } else {
            target[key] = source[key];
        }
    }
}

/* ---------------- VERSION CHECK ---------------- */
const getBaseHead = async () => {
    try {
        logger.custom("Checking for updates...", "NJC-UPDATE");

        const { data } = await axios.get(allVersionsURL);
        const currentVersion = JSON.parse(readFileSync("./package.json")).version;

        const index = data.findIndex(v => v.version === currentVersion);
        if (index <= 0) return null;

        return `${data[index].head}...${data[0].head}`;
    } catch (err) {
        console.error(err);
        logger.error("Update check failed");
        process.exit(0);
    }
};

/* ---------------- GET DIFF ---------------- */
const getDiffs = async (range) => {
    const { data } = await axios.get(
        `https://api.github.com/repos/XaviaTeam/XaviaBot/compare/${range}`
    );

    const diffs = {
        added: [],
        removed: [],
        modified: [],
        renamed: []
    };

    for (const file of data.files) {
        if (
            file.filename.includes("config.plugins.json")
        ) continue;

        if (file.status === "added") diffs.added.push(file.filename);
        if (file.status === "removed") diffs.removed.push(file.filename);
        if (file.status === "modified") diffs.modified.push(file.filename);

        if (file.status === "renamed") {
            diffs.renamed.push({
                old: file.previous_filename,
                new: file.filename
            });
        }
    }

    return diffs;
};

/* ---------------- PRINT DIFF ---------------- */
const toStringDiffs = (diffs) => {
    let text = "";

    if (diffs.added.length)
        text += "\nAdded:\n" + diffs.added.map(f => `- ${f}`).join("\n");

    if (diffs.removed.length)
        text += "\nRemoved:\n" + diffs.removed.map(f => `- ${f}`).join("\n");

    if (diffs.modified.length)
        text += "\nModified:\n" + diffs.modified.map(f => `- ${f}`).join("\n");

    if (diffs.renamed.length)
        text += "\nRenamed:\n" + diffs.renamed.map(f => `- ${f.old} -> ${f.new}`).join("\n");

    return text;
};

/* ---------------- BACKUP ---------------- */
const backup = (files = []) => {
    for (const file of files) {
        const src = resolve(file);
        const dest = resolve(`./backup/${file}`);

        if (!existsSync(src)) continue;

        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
    }
};

/* ---------------- FIXED PACKAGE MERGE ---------------- */
const mergePackageJSON = (lock = false) => {
    const oldPath = lock ? "./backup/package-lock.json" : "./backup/package.json";
    const newPath = lock ? "./package-lock.json" : "./package.json";

    if (!existsSync(oldPath)) return;

    const oldData = JSON.parse(readFileSync(oldPath));
    const newData = JSON.parse(readFileSync(newPath));

    deepAssign(oldData, newData);
    writeFileSync(newPath, JSON.stringify(oldData, null, 2));
};

/* ---------------- CLEAN REMOVE ---------------- */
const removeFiles = (files = []) => {
    for (const file of files) {
        const path = resolve(file);

        if (existsSync(path) && statSync(path).isFile()) {
            unlinkSync(path);
        }
    }
};

/* ---------------- UPDATE FLOW ---------------- */
const update = (diffs, head) => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("\nClear backup? (y/n): ", async (ans) => {
        rl.close();

        if (ans.toLowerCase() !== "y") {
            logger.warn("Update cancelled");
            return;
        }

        rmSync("./backup", { recursive: true, force: true });
        mkdirSync("./backup");

        const allFiles = [
            ...diffs.added,
            ...diffs.modified,
            ...diffs.renamed.map(r => r.new)
        ];

        backup([...diffs.added, ...diffs.modified, ...diffs.removed]);

        for (const file of allFiles) {
            const url = `${baseURL}/${head}/${file}`;
            const path = resolve(file);

            mkdirSync(dirname(path), { recursive: true });

            try {
                const res = await axios.get(url, { responseType: "stream" });
                const writer = createWriteStream(path);

                res.data.pipe(writer);

                writer.on("finish", () => {
                    logger.custom(`Updated ${file}`, "NJC");
                });
            } catch (err) {
                console.error("Failed:", file);
            }
        }

        removeFiles(diffs.removed);
    });
};

/* ---------------- MAIN ---------------- */
const main = async () => {
    try {
        const range = await getBaseHead();

        if (!range) {
            logger.custom("No update available", "NJC");
            return;
        }

        const diffs = await getDiffs(range);

        console.log(toStringDiffs(diffs));

        const rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question("\nUpdate now? (y/n): ", (ans) => {
            rl.close();
            if (ans.toLowerCase() === "y") {
                update(diffs, range.split("...")[1]);
            } else {
                logger.warn("Cancelled");
            }
        });

    } catch (err) {
        console.error(err);
        logger.error("Update system failed");
    }
};

main();

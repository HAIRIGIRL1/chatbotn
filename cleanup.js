import { readdirSync, statSync, unlinkSync, existsSync } from "fs";

const folders = [
    "./plugins/commands/cache/",
    "./core/var/data/cache/"
];

try {
    for (const path of folders) {

        if (!existsSync(path)) continue;

        const files = readdirSync(path);

        for (const file of files) {
            const filePath = `${path}${file}`;

            if (!existsSync(filePath)) continue;

            if (statSync(filePath).isFile() && file !== "README.txt") {
                unlinkSync(filePath);
            }
        }
    }
} catch (e) {
    console.error("Cache cleanup error:", e);
}

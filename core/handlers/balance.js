import { BalanceError } from "./exceptions.js";

export class Balance {
    constructor() {}

    static MAX_BALANCE_LIMIT = -1n;

    static setLimit(amount) {
        const parsedAmount = Balance.makeSafe(amount);
        Balance.MAX_BALANCE_LIMIT = parsedAmount == null ? -1n : parsedAmount;
    }

    static make(...num) {
        return num.reduce((acc, cur) => acc + BigInt(cur), 0n);
    }

    static makeSafe(...num) {
        try {
            return Balance.make(...num);
        } catch {
            return null;
        }
    }

    static add(userID, ...amount) {
        const targetUser = global.data.users.get(userID);

        if (!targetUser)
            throw new BalanceError("USER_NOT_EXISTS", `User "${userID}" not available.`);

        if (!targetUser.data)
            throw new BalanceError(
                "UNEXPECTED",
                "This should not occur. If you encounter this issue, please report it to the creator."
            );

        let newAmount = Balance.make(targetUser.data["money"] ?? 0, ...amount);

        if (Balance.MAX_BALANCE_LIMIT != -1n) {
            newAmount =
                newAmount > Balance.MAX_BALANCE_LIMIT
                    ? Balance.MAX_BALANCE_LIMIT
                    : newAmount;
        }

        targetUser.data["money"] = newAmount < 0n ? 0n : newAmount;
    }

    static sub(userID, ...amount) {
        const targetUser = global.data.users.get(userID);

        if (!targetUser)
            throw new BalanceError("USER_NOT_EXISTS", `User "${userID}" not available.`);

        if (!targetUser.data)
            throw new BalanceError(
                "UNEXPECTED",
                "This should not occur. If you encounter this issue, please report it to the creator."
            );

        let newAmount = Balance.make(
            targetUser.data["money"] ?? 0,
            ...amount.map((n) => BigInt(n) * -1n)
        );

        if (Balance.MAX_BALANCE_LIMIT != -1n) {
            newAmount =
                newAmount > Balance.MAX_BALANCE_LIMIT
                    ? Balance.MAX_BALANCE_LIMIT
                    : newAmount;
        }

        targetUser.data["money"] = newAmount < 0n ? 0n : newAmount;
    }

    static get(userID) {
        const targetUser = global.data.users.get(userID);

        if (!targetUser)
            throw new BalanceError("USER_NOT_EXISTS", `User "${userID}" not available.`);

        if (!targetUser.data)
            throw new BalanceError(
                "UNEXPECTED",
                "This should not occur. If you encounter this issue, please report it to the creator."
            );

        return BigInt(targetUser.data["money"] ?? 0);
    }

    static set(userID, amount) {
        const targetUser = global.data.users.get(userID);

        if (!targetUser)
            throw new BalanceError("USER_NOT_EXISTS", `User "${userID}" not available.`);

        if (!targetUser.data)
            throw new BalanceError(
                "UNEXPECTED",
                "This should not occur. If you encounter this issue, please report it to the creator."
            );

        const isLimitExceed =
            Balance.MAX_BALANCE_LIMIT != -1n && BigInt(amount) > Balance.MAX_BALANCE_LIMIT;

        targetUser.data["money"] = Balance.make(
            isLimitExceed ? Balance.MAX_BALANCE_LIMIT : amount
        );
    }

    static from(userID) {
        if (!global.data.users.has(userID)) return null;

        return {
            add: (...amount) => Balance.add(userID, ...amount),
            sub: (...amount) => Balance.sub(userID, ...amount),
            get: () => Balance.get(userID),
            set: (amount) => Balance.set(userID, amount),
        };
    }
}

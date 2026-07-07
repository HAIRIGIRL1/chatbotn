all() {
    const returnValues = [];
    const map = new Map();

    for (const effect of this.#effects) {
        if (!map.has(effect.userID)) {
            const entry = {
                userID: effect.userID,
                effects: [],
            };

            map.set(effect.userID, entry);
            returnValues.push(entry);
        }

        map.get(effect.userID).effects.push({
            name: effect.name,
            value: effect.value,
        });
    }

    return returnValues;
}

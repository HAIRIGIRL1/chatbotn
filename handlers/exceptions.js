export class BalanceError extends Error {
    constructor(name, message) {
        super(message);
        this.name = name;
    }
}

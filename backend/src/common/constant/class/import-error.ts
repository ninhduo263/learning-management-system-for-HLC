export class ImportError extends Error {
    constructor(private readonly messages: string[]) {
        super();
        Error.captureStackTrace(this);
    }

    getMessages() {
        return this.messages;
    }
}

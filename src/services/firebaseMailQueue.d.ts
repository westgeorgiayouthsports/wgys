export declare const mailQueue: {
    enqueueMail(to: string, subject: string, html: string): Promise<boolean>;
};

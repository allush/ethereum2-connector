interface Ethereum2 {
    send: unknown;
    enable: () => Promise<string[]>;
    on?: (method: string, listener: (...args: any[]) => void) => void;
    removeListener?: (method: string, listener: (...args: any[]) => void) => void;
}
declare interface Window {
    ethereum2?: Ethereum2;
}
declare const __DEV__: boolean;

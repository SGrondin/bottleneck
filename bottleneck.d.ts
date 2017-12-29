declare module "bottleneck" {
    namespace Bottleneck {
        type ConstructorOptions = {
            readonly maxConcurrent?: number;
            readonly minTime?: number;
            readonly highWater?: number;
            readonly strategy?: Bottleneck.Strategy;
            readonly penalty?: number;
            readonly reservoir?: number;
            readonly datastore?: string;
            readonly id?: string;
            readonly rejectOnDrop?: boolean;
            readonly clientOptions?: any;
            readonly clearDatastore?: boolean;
            [propName: string]: any;
        };
        type JobOptions = {
            readonly priority?: number;
            readonly weight?: number;
            readonly expiration?: number;
            readonly id?: string;
        };
        type GroupOptions = {
            readonly timeout?: number;
        };
        type Callback<T> = (err: any, result: T) => void;
        interface ClientsList { client?: any; subscriber?: any }
        interface GroupLimiterPair { key: string; limiter: Bottleneck }
        interface Strategy {}

        class Group {
            constructor(options?: Bottleneck.ConstructorOptions);

            /**
             * Returns the limiter for the specified key.
             * @param str - The limiter key.
             */
            key(str: string): Bottleneck;

            /**
             * Disables limiter garbage collection.
             */
            stopAutoCleanup(): void;

            /**
             * Enables limiter garbage collection.
             */
            startAutoCleanup(): void;

            /**
             * Updates the group settings.
             * @param options - The new settings.
             */
             updateSettings(options: Bottleneck.GroupOptions): void;

            /**
             * Deletes the limiter for the given key
             * @param str - The key
             */
            deleteKey(str: string): void;

            /**
             * Returns all the key-limiter pairs.
             */
            limiters(): Bottleneck.GroupLimiterPair[];

            /**
             * Returns all the keys in the Cluster
             */
            keys(): string[];
        }
    }

    class Bottleneck {
        public static readonly strategy: {
            /**
             * When submitting a new request, if the queue length reaches highWater, drop the oldest request with the lowest priority. This is useful when requests that have been waiting for too long are not important anymore. If all the queued up requests are more important than the one being added, it won't be added.
             */
            readonly LEAK: Bottleneck.Strategy;
            /**
             * Same as LEAK, except that it will only drop requests that are less important than the one being added. If all the queued up requests are as important or more than the new one, it won't be added.
             */
            readonly OVERFLOW_PRIORITY: Bottleneck.Strategy;
            /**
             * When submitting a new request, if the queue length reaches highWater, do not add the new request. This strategy totally ignores priority levels.
             */
            readonly OVERFLOW: Bottleneck.Strategy;
            /**
             * When submitting a new request, if the queue length reaches highWater, the limiter falls into "blocked mode". All queued requests are dropped and no new requests will be accepted until the limiter unblocks. It will unblock after penalty milliseconds have passed without receiving a new request. penalty is equal to 15 * minTime (or 5000 if minTime is 0) by default and can be changed by calling changePenalty(). This strategy is ideal when bruteforce attacks are to be expected. This strategy totally ignores priority levels.
             */
            readonly BLOCK: Bottleneck.Strategy;
        };

        constructor(options?: Bottleneck.ConstructorOptions);

        /**
         * Returns a promise which will be resolved once the limiter is ready to accept jobs
         * or rejected if it fails to start up.
         */
        ready(): Promise<any>;

        /**
         * Returns a datastore-specific object of redis clients.
         */
        clients(): Bottleneck.ClientsList;

        /**
         * Disconnects all redis clients.
         * @param flush - Write transient data before closing.
         */
        disconnect(flush?: boolean): Bottleneck;

        /**
         * Returns the number of requests queued.
         * @param priority - Returns the number of requests queued with the specified priority.
         */
        queued(priority?: number): number;

        /**
         * Returns the number of requests running.
         */
        running(): Promise<number>;

        /**
         * If a request was added right now, would it be run immediately?
         * @param weight - The weight of the request
         */
        check(weight?: number): Promise<boolean>;

        /**
         * Register an event listener.
         * @param name - The event name.
         * @param fn - The callback function.
         */
        on(name: string, fn: Function): Bottleneck;
        on(name: "error", fn: (error: any) => void): Bottleneck;
        on(name: "empty", fn: () => void): Bottleneck;
        on(name: "idle", fn: () => void): Bottleneck;
        on(name: "dropped", fn: (dropped: any) => void): Bottleneck;
        on(name: "debug", fn: (message: string, data: any) => void): Bottleneck;

        /**
         * Register an event listener for one event only.
         * @param name - The event name.
         * @param fn - The callback function.
         */
        once(name: string, fn: Function): Bottleneck;
        once(name: "error", fn: (error: any) => void): Bottleneck;
        once(name: "empty", fn: () => void): Bottleneck;
        once(name: "idle", fn: () => void): Bottleneck;
        once(name: "dropped", fn: (dropped: any) => void): Bottleneck;
        once(name: "debug", fn: (message: string, data: any) => void): Bottleneck;

        /**
         * Removes all registered event listeners.
         * @param name - The optional event name to remove listeners from.
         */
        removeAllListeners(name?: string): Bottleneck;

        /**
         * Changes the settings for future requests.
         * @param options - The new settings.
         */
        updateSettings(options?: Bottleneck.ConstructorOptions): Bottleneck;

        /**
         * Adds to the reservoir count.
         */
        incrementReservoir(incrementBy: number): Bottleneck;

        /**
         * Returns the current reservoir count, if any.
         */
        currentReservoir(): Promise<number | null>;

        /**
         * Chain this limiter to another.
         * @param limiter - The limiter that requests to this limiter must also follow.
         */
        chain(limiter?: Bottleneck): Bottleneck;

        wrap<R>(fn: () => PromiseLike<R>): () => Promise<R>;
        wrap<R, A1>(fn: (arg1: A1) => PromiseLike<R>): (A1) => Promise<R>;
        wrap<R, A1, A2>(fn: (arg1: A1, arg2: A2) => PromiseLike<R>): (A1, A2) => Promise<R>;
        wrap<R, A1, A2, A3>(fn: (arg1: A1, arg2: A2, arg3: A3) => PromiseLike<R>): (A1, A2, A3) => Promise<R>;
        wrap<R, A1, A2, A3, A4>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => PromiseLike<R>): (A1, A2, A3, A4) => Promise<R>;
        wrap<R, A1, A2, A3, A4, A5>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => PromiseLike<R>): (A1, A2, A3, A4, A5) => Promise<R>;
        wrap<R, A1, A2, A3, A4, A5, A6>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6) => PromiseLike<R>): (A1, A2, A3, A4, A5, A6) => Promise<R>;
        wrap<R, A1, A2, A3, A4, A5, A6, A7>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7) => PromiseLike<R>): (A1, A2, A3, A4, A5, A6, A7) => Promise<R>;
        wrap<R, A1, A2, A3, A4, A5, A6, A7, A8>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8) => PromiseLike<R>): (A1, A2, A3, A4, A5, A6, A7, A8) => Promise<R>;
        wrap<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9) => PromiseLike<R>): (A1, A2, A3, A4, A5, A6, A7, A8, A9) => Promise<R>;
        wrap<R, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10) => PromiseLike<R>): (A1, A2, A3, A4, A5, A6, A7, A8, A9, A10) => Promise<R>;

        submit<R>(fn: (callback: Bottleneck.Callback<R>) => void, callback: Bottleneck.Callback<R>): void;
        submit<R, A1>(fn: (arg1: A1, callback: Bottleneck.Callback<R>) => void, arg1: A1, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2>(fn: (arg1: A1, arg2: A2, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3>(fn: (arg1: A1, arg2: A2, arg3: A3, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7, A8>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10, callback: Bottleneck.Callback<R>): void;

        submit<R>(options: Bottleneck.JobOptions, fn: (callback: Bottleneck.Callback<R>) => void, callback: Bottleneck.Callback<R>): void;
        submit<R, A1>(options: Bottleneck.JobOptions, fn: (arg1: A1, callback: Bottleneck.Callback<R>) => void, arg1: A1, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7, A8>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, callback: Bottleneck.Callback<R>): void;
        submit<R, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10, callback: Bottleneck.Callback<R>): void;

        schedule<R>(fn: () => PromiseLike<R>): Promise<R>;
        schedule<R, A1>(fn: (arg1: A1) => PromiseLike<R>, arg1: A1): Promise<R>;
        schedule<R, A1, A2>(fn: (arg1: A1, arg2: A2) => PromiseLike<R>, arg1: A1, arg2: A2): Promise<R>;
        schedule<R, A1, A2, A3>(fn: (arg1: A1, arg2: A2, arg3: A3) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3): Promise<R>;
        schedule<R, A1, A2, A3, A4>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7, A8>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10): Promise<R>;

        schedule<R>(options: Bottleneck.JobOptions, fn: () => PromiseLike<R>): Promise<R>;
        schedule<R, A1>(options: Bottleneck.JobOptions, fn: (arg1: A1) => PromiseLike<R>, arg1: A1): Promise<R>;
        schedule<R, A1, A2>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2) => PromiseLike<R>, arg1: A1, arg2: A2): Promise<R>;
        schedule<R, A1, A2, A3>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3): Promise<R>;
        schedule<R, A1, A2, A3, A4>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7, A8>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9): Promise<R>;
        schedule<R, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(options: Bottleneck.JobOptions, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10): Promise<R>;
    }

    export default Bottleneck;
}


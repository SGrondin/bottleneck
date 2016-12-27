
declare module "bottleneck" {
    namespace Bottleneck {
        type Callback<T> = (err: any, result: T) => void;
        interface Strategy {
        }

        class Cluster {
            /**
             * Constructs a bottleneck Cluser using the given options.
             * @param maxConcurrent - How many requests can be running at the same time. Default: 0 (unlimited)
             * @param minTime - How long to wait after launching a request before launching another one. Default: 0ms
             * @param highWater - How long can the queue get? Default: -1 (unlimited)
             * @param strategy - Which strategy to use if the queue gets longer than the high water mark. Default: Bottleneck.strategy.LEAK
             * @param rejectOnDrop - When true if a job is dropped its callback will be called with the first argument set to an Error object. If the job was a promise it will be rejected. Default: false
             */
            constructor(maxConcurrent?: number, minTime?: number, highWater?: number, strategy?: Bottleneck.Strategy, rejectOnDrop?: boolean);

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
             * Deletes the limiter for the given key
             * @param str - The key
             */
            deleteKey(str: string): void;

            /**
             * Runs the give function on every limiter in the Cluster
             * @param cb - The callback function
             */
            all(cb: (limiter: Bottleneck) => void): void;

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

        /**
         * Constructs a new bottleneck limiter
         * @param maxConcurrent - How many requests can be running at the same time. Default: 0 (unlimited)
         * @param minTime - How long to wait after launching a request before launching another one. Default: 0ms
         * @param highWater - How long can the queue get? Default: -1 (unlimited)
         * @param strategy - Which strategy to use if the queue gets longer than the high water mark. Default: Bottleneck.strategy.LEAK
         * @param rejectOnDrop - When true if a job is dropped its callback will be called with the first argument set to an Error object. If the job was a promise it will be rejected. Default: false
         */
        constructor(maxConcurrent?: number, minTime?: number, highWater?: number, strategy?: Bottleneck.Strategy, rejectOnDrop?: boolean);

        /**
         * Returns the number of requests queued.
         * @param priority - Returns the number of requests queued with the specified priority.
         */
        nbQueued(priority?: number): number;

        /**
         * Returns the number of requests running.
         */
        nbRunning(): number;

        /**
         * If a request was added right now, would it be run immediately?
         */
        check(): boolean;

        /**
         * Is the limiter currently in "blocked mode"?
         */
        isBlocked(): boolean;

        /**
         * Cancels all queued up requests and every added request will be automatically rejected.
         * @param interrupt - If true, prevent the requests currently running from calling their callback when they're done. Default: false.
         */
        stopAll(interrupt?: boolean): void;

        /**
         * Register an event listener.
         * @param name - The event name.
         * @param fn - The callback function.
         */
        on(name: string, fn: Function): void;
        on(name: "empty", fn: () => void): void;
        on(name: "idle", fn: () => void): void;
        on(name: "dropped", fn: (dropped: any) => void): void;
        
        /**
         * Removes all registered event listeners.
         * @param name - The optional event name to remove listeners from.
         */
        removeAllListeners(name?: string): void;

        /**
         * Changes the settings for future requests.
         * @param maxConcurrent - How many requests can be running at the same time. Default: 0 (unlimited)
         * @param minTime - How long to wait after launching a request before launching another one. Default: 0ms
         * @param highWater - How long can the queue get? Default: -1 (unlimited)
         * @param strategy - Which strategy to use if the queue gets longer than the high water mark. Default: Bottleneck.strategy.LEAK
         * @param rejectOnDrop - When true if a job is dropped its callback will be called with the first argument set to an Error object. If the job was a promise it will be rejected. Default: false
         */
        changeSettings(maxConcurrent?: number, minTime?: number, highWater?: number, strategy?: Bottleneck.Strategy, rejectOnDrop?: boolean): void;

        /**
         * Changes the penalty value used by the BLOCK strategy.
         */
        changePenalty(penalty: number): void;

        /**
         * Changes the reservoir count.
         */
        changeReservoir(reservoir: number): void;

        /**
         * Adds to the reservoir count.
         */
        incrementReservoir(incrementBy: number): void;
        
        /**
         * Chain this limiter to another.
         * @param other - The limiter that requests to this limiter must also follow.
         */
        chain(other: Bottleneck): void;

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

        submitPriority<R>(priority: number, fn: (callback: Bottleneck.Callback<R>) => void, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1>(priority: number, fn: (arg1: A1, callback: Bottleneck.Callback<R>) => void, arg1: A1, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2>(priority: number, fn: (arg1: A1, arg2: A2, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3, A4>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3, A4, A5>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3, A4, A5, A6>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3, A4, A5, A6, A7>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3, A4, A5, A6, A7, A8>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, callback: Bottleneck.Callback<R>): void;
        submitPriority<R, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10, callback: Bottleneck.Callback<R>) => void, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10, callback: Bottleneck.Callback<R>): void;

        schedulePriority<R>(priority: number, fn: () => PromiseLike<R>): Promise<R>;
        schedulePriority<R, A1>(priority: number, fn: (arg1: A1) => PromiseLike<R>, arg1: A1): Promise<R>;
        schedulePriority<R, A1, A2>(priority: number, fn: (arg1: A1, arg2: A2) => PromiseLike<R>, arg1: A1, arg2: A2): Promise<R>;
        schedulePriority<R, A1, A2, A3>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3): Promise<R>;
        schedulePriority<R, A1, A2, A3, A4>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4): Promise<R>;
        schedulePriority<R, A1, A2, A3, A4, A5>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5): Promise<R>;
        schedulePriority<R, A1, A2, A3, A4, A5, A6>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6): Promise<R>;
        schedulePriority<R, A1, A2, A3, A4, A5, A6, A7>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7): Promise<R>;
        schedulePriority<R, A1, A2, A3, A4, A5, A6, A7, A8>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8): Promise<R>;
        schedulePriority<R, A1, A2, A3, A4, A5, A6, A7, A8, A9>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9): Promise<R>;
        schedulePriority<R, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(priority: number, fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10) => PromiseLike<R>, arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, arg8: A8, arg9: A9, arg10: A10): Promise<R>;
    }

    export = Bottleneck;
}
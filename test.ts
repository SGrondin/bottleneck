/// <reference path="bottleneck.d.ts" />

import Bottleneck from "bottleneck";

function withCb(foo: number, bar: () => void, cb: (err: any, result: string) => void) {
    cb(undefined, "foo");
}

let limiter = new Bottleneck(5, 1000, 10, Bottleneck.strategy.LEAK, true);

limiter.submit(withCb, 1, () => {}, (err, result) => {
    let s: string = result;
});

limiter.submitPriority(4, withCb, 1, () => {}, (err, result) => {
    let s: string = result;
});

function withPromise(foo: number, bar: () => void): PromiseLike<string> {
    return Promise.resolve("foo");
}

let foo: Promise<string> = limiter.schedule(withPromise, 1, () => {});
let foo2: Promise<string> = limiter.schedulePriority(4, withPromise, 1, () => {});


let cluster = new Bottleneck.Cluster(5, 1000, 10, Bottleneck.strategy.LEAK, true);

cluster.key("foo").submit(withCb, 1, () => {}, (err, result) => {
    let s: string = result;
});

cluster.key("bar").submitPriority(4, withCb, 1, () => {}, (err, result) => {
    let s: string = result;
});

foo = cluster.key("pizza").schedule(withPromise, 1, () => {});
foo2 = cluster.key("pie").schedulePriority(4, withPromise, 1, () => {});
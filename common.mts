import type * as ws from 'ws';

export const SERVER_PORT = 6970;
export const WORLD_FACTOR = 200;
export const WORLD_WIDTH = 4*WORLD_FACTOR;
export const WORLD_HEIGHT = 3*WORLD_FACTOR;
export const PLAYER_SIZE = 30;
export const PLAYER_SPEED = 500;

export type Direction = 'left' | 'right' | 'up' | 'down';

type Moving = {
    [key in Direction]: boolean
}

export type Vector2 = {x: number, y: number};
export const DIRECTION_VECTORS: {[key in Direction]: Vector2} = {
    'left':  {x: -1, y: 0},
    'right': {x: 1, y: 0},
    'up':    {x: 0, y: -1},
    'down':  {x: 0, y: 1},
};

function isDirection(arg: any): arg is Direction {
    return DIRECTION_VECTORS[arg as Direction] !== undefined;
}

export interface Player {
    id: number,
    x: number,
    y: number,
    moving: Moving,
    hue: number,
}

export function isNumber(arg: any): arg is number {
    return typeof(arg) === 'number';
}

export function isString(arg: any): arg is string {
    return typeof(arg) === 'string';
}

export function isBoolean(arg: any): arg is boolean {
    return typeof(arg) === 'boolean';
}

export enum MessageKind {
    Hello,
    PlayerJoined,
}

interface Field {
    offset: number,
    size: number,
    read(view: DataView, baseOffset: number): number;
    write(view: DataView, baseOffset: number, value: number): void;
}

const UINT8_SIZE = 1;
const UINT32_SIZE = 4;
const FLOAT32_SIZE = 4;

function allocUint8Field(allocator: { iota: number }): Field {
    const offset = allocator.iota;
    const size = UINT8_SIZE;
    allocator.iota += size;
    return {
        offset,
        size,
        read: (view, baseOffset) => view.getUint8(baseOffset + offset),
        write: (view, baseOffset, value) => view.setUint8(baseOffset + offset, value)
    }
}

function allocUint32Field(allocator: { iota: number }): Field {
    const offset = allocator.iota;
    const size = UINT32_SIZE;
    allocator.iota += size;
    return {
        offset,
        size,
        read: (view, baseOffset) => view.getUint32(baseOffset + offset, true),
        write: (view, baseOffset, value) => view.setUint32(baseOffset + offset, value, true)
    }
}

function allocFloat32Field(allocator: { iota: number }): Field {
    const offset = allocator.iota;
    const size = FLOAT32_SIZE;
    allocator.iota += size;
    return {
        offset,
        size,
        read: (view, baseOffset) => view.getFloat32(baseOffset + offset, true),
        write: (view, baseOffset, value) => view.setFloat32(baseOffset + offset, value, true)
    }
}

// [kind: Uint8] [id: Uint32] [x: Float32] [y: Float32] [hue: Uint8]
export const HelloStruct = (() => {
    const allocator = { iota: 0 };
    return {
        kind : allocUint8Field(allocator),
        id   : allocUint32Field(allocator),
        x    : allocFloat32Field(allocator),
        y    : allocFloat32Field(allocator),
        hue  : allocUint8Field(allocator),
        size : allocator.iota,
    }
})();

export interface PlayerJoined {
    kind: 'PlayerJoined',
    id: number,
    x: number,
    y: number,
    hue: number,
}

export function isPlayerJoined(arg: any): arg is PlayerJoined {
    return arg
        && arg.kind === 'PlayerJoined'
        && isNumber(arg.id)
        && isNumber(arg.x)
        && isNumber(arg.y)
        && isNumber(arg.hue)
}

export interface PlayerLeft {
    kind: 'PlayerLeft',
    id: number,
}

export function isPlayerLeft(arg: any): arg is PlayerLeft {
    return arg
        && arg.kind === 'PlayerLeft'
        && isNumber(arg.id)
}

export interface AmmaMoving {
    kind: 'AmmaMoving',
    start: boolean,
    direction: Direction,
}

export function isAmmaMoving(arg: any): arg is AmmaMoving {
    return arg
        && arg.kind === 'AmmaMoving'
        && isBoolean(arg.start)
        && isDirection(arg.direction);
}

export interface PlayerMoving {
    kind: 'PlayerMoving',
    id: number,
    x: number,
    y: number,
    start: boolean,
    direction: Direction,
}

export function isPlayerMoving(arg: any): arg is PlayerMoving {
    return arg
        && arg.kind === 'PlayerMoving'
        && isNumber(arg.id)
        && isNumber(arg.x)
        && isNumber(arg.y)
        && isBoolean(arg.start)
        && isDirection(arg.direction);
}

export type Event = PlayerJoined | PlayerLeft | PlayerMoving;

function properMod(a: number, b: number): number {
    return (a%b + b)%b;
}

export function updatePlayer(player: Player, deltaTime: number) {
    let dir: Direction;
    let dx = 0;
    let dy = 0;
    for (dir in DIRECTION_VECTORS) {
        if (player.moving[dir]) {
            dx += DIRECTION_VECTORS[dir].x;
            dy += DIRECTION_VECTORS[dir].y;
        }
    }
    const l = dx*dx + dy*dy;
    if (l !== 0) {
        dx /= l;
        dy /= l;
    }
    player.x = properMod(player.x + dx*PLAYER_SPEED*deltaTime, WORLD_WIDTH);
    player.y = properMod(player.y + dy*PLAYER_SPEED*deltaTime, WORLD_HEIGHT);
}

interface Message {
    kind: string,
}

export function sendMessage<T extends Message>(socket: ws.WebSocket | WebSocket, message: T): number {
    const text = JSON.stringify(message);
    socket.send(text);
    return text.length;
}

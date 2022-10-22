import { Position } from './types'

export function distance(a: Position, b: Position) {
    const x = a.x-b.x;
    const y = a.y-b.y;
    return Math.sqrt(x*x+y*y);
}

export function magnitude(a: Position) {
    return Math.sqrt(a.x*a.x+a.y*a.y);
}

export function difference(a: Position, b: Position) {
    return {x: a.x-b.x, y:a.y-b.y};
}

export function clamp(a: Position, max: number) {
    const m = magnitude(a);
    if (m <= max)
        return { x: a.x, y: a.y };
    else {
        const f = max / m;
        return { x: a.x * f, y: a.y * f };
    }
}

export function sum(a: Position, b: Position) {
    return {x: a.x + b.x, y: a.y + b.y };
}

export function angleFromTo(a: Position, b: Position) {
    return (Math.atan2(a.y-b.y, b.x-a.x) + Math.PI * 2) % (Math.PI * 2);
}

export function unitVector(a: Position, b: Position) {
    const angle = angleFromTo(a, b);
    return {x: Math.cos(angle), y: Math.sin(angle)};
}

export function vecSet(a: Position, b: Position) {
    a.x = b.x;
    a.y = b.y;
}

export function vecAdd(a: Position, b: Position) {
    a.x += b.x;
    a.y += b.y;
}

import { Unit } from '../../types'

export const becomeIdleAtCurrentPosition = (unit: Unit) => {
    unit.state = {
        state: 'idle',
        action: 'Idle',
        actionTime: 0,
        idlePosition: { x: unit.position.x, y: unit.position.y },
    }
}

export function stopMoving(unit: Unit) {
    unit.velocity.x = 0;
    unit.velocity.y = 0;
    unit.pathToNext = undefined;
}

export const clearCurrentCommand = (unit: Unit) => {
    stopMoving(unit);
    if (unit.state.state === 'active') {
        const next = unit.state.rest.shift();
        if (next) {
            unit.state.current = next;
        }
        else {
            becomeIdleAtCurrentPosition(unit);
        }
    }
}

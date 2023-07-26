import { Position } from '@bananu7-rts/server/src/types'

export function clampToGrid(p: Position): Position{
	return {
		x: Math.floor(p.x/2)*2,
        y: Math.floor(p.y/2)*2
    }
}
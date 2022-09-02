import { useState, useEffect } from 'react'
import { Board } from 'server/types'

type Props = {
    board: Board
}

export function Minimap(props: Props) {
    const style = {
        position: 'absolute',
        left: 0,
        bottom: 0,
        border: '5px solid black',
        width: '300px',
        height: '300px',
    };

    const unitStyle = {
        fill:'blue',
        strokeWidth: 1,
        stroke: 'black'
    };

    const contents = props.board.units.map(u => 
        <rect
            key={u.id}
            x={u.position.x}
            y={u.position.y}
            width="3"
            height="3"
            style={unitStyle}
        />
    );

    return (
        <svg style={style}>
            {contents}
        </svg>
    );
}
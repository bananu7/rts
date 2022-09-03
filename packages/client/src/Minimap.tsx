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
        backgroundColor: 'white',
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
            width="10"
            height="10"
            style={unitStyle}
        />
    );

    return (
        <div style={style}>
            <svg style={{width: '100%', height: '100%'}}>
                {contents}
            </svg>
        </div>
    );
}
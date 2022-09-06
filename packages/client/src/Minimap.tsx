import { useState, useEffect, CSSProperties } from 'react'
import { Board, UnitState } from 'server/types'

type Props = {
    board: Board,
    units: UnitState[],
}

export function Minimap(props: Props) {
    const style : CSSProperties = {
        position: 'absolute',
        left: 0,
        bottom: 5,
        border: '5px solid black',
        width: '300px',
        height: '300px',
        backgroundColor: '#11cc11',
        boxSizing: 'border-box',
    };

    const unitStyle = {
        fill:'blue',
        strokeWidth: 1,
        stroke: 'black'
    };

    const contents = props.units.map(u => {
        const color = u.owner === 1 ? '#1111ee' : '#ee1111';
        const size = u.kind === 'Base' ? '20' : '10';
        return (<rect
            key={u.id}
            x={u.position.x}
            y={u.position.y}
            width={size}
            height={size}
            style={{...unitStyle, fill: color}}
        />);
    });

    return (
        <div style={style}>
            <svg style={{width: '100%', height: '100%'}}>
                {contents}
            </svg>
        </div>
    );
}
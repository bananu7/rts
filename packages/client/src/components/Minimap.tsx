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
        bottom: 0,
        width: '300px',
        height: '300px',
        backgroundColor: '#11aa11',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0px 0px 37px 0px rgba(0,0,0,0.5)',
        borderRadius: '0 10px 0 0',
    };

    const unitStyle = {
        fill:'blue',
        strokeWidth: 1,
        stroke: 'black'
    };

    const contents = props.units.map(u => {
        const ownerToColor = (owner: number) => {
            switch(owner) {
            case 0: return "#dddddd";
            case 1: return "#3333ff";
            case 2: return "#ee1111";
            }
        };
        const color = ownerToColor(u.owner);

        const size = u.kind === 'Base' ? '8' : '3';
        return (<rect
            key={u.id}
            x={u.position.x}
            y={u.position.y}
            width={size}
            height={size}
            style={{...unitStyle, fill: color}}
        />);
    });

    // TODO proper scaling to map size
    return (
        <div style={style}>
            <svg viewBox="0 0 110 110" style={{width: '100%', height: '100%'}}>
                {contents}
            </svg>
        </div>
    );
}
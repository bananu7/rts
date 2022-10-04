import { useEffect, useState } from 'react'

type Props = {
    messages: string[],
    sendMessage: (msg: string) => void;
}

export function Chat(props: Props) {
    const [lastIndex, setLastIndex] = useState(0);

    // TODO - make chat disappear after some time
    const messages = props.messages.slice(props.messages.length-1).map((m, i) => 
        <span key={i}>{m}</span>
    );

    const style = {
        position: "absolute",
        top: "70%",
        left: "40%",
        zIndex: "2",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    } as React.CSSProperties;

    return (
        <div style={style} className="Chat">
            { messages }
        </div>
    );
}

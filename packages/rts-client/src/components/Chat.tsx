import { useEffect, useState, useRef } from 'react'

type Props = {
    messages: string[],
    sendMessage: (msg: string) => void;
}

export function Chat(props: Props) {
    const [lastIndex, setLastIndex] = useState(0);

    // TODO - make chat disappear after some time
    const messages =
        props.messages.slice(props.messages.length-5).map((m, i) => 
            <span key={i}>{m}</span>
        );

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.style.visibility = "visible";
        }
        const hide = setTimeout(() => {
            if (ref.current) {
                ref.current.style.visibility = "hidden";
            }
        }, 2000);
        return () => clearTimeout(hide);
    }, [props.messages]);

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
        <div ref={ref} style={style} className="Chat">
            { messages }
        </div>
    );
}

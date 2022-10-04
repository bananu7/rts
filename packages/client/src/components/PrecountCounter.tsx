export function PrecountCounter(props: { count: number }) {
    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
    } as React.CSSProperties;

    return (
        <div style={style} className="PrecountCounter"> 
            <span >{Math.floor(props.count / 1000)}</span>
        </div>
    );
}

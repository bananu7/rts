
export function ResourceView(props: {resources: number, units: number}) {
	return (
		<div className="ResourceView">
			<span>Resources: {props.resources}</span>
			<span>Units: {props.units}/50</span>
		</div>
	)
}

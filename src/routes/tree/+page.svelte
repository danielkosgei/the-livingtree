<script>
	import { SvelteFlow, MiniMap, Controls, Background, Panel } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import MemberNode from '$lib/nodes/MemberNode.svelte';

	const nodeTypes = { memberUpdater: MemberNode };

	let nodes = $state.raw([
		{
			id: '1',
			type: 'memberUpdater',
			position: { x: 0, y: 0 },
			data: { label: 'Jane Doe', birthYear: 1930, isLiving: false }
		},
		{
			id: '2',
			type: 'memberUpdater',
			position: { x: 100, y: 100 },
			data: { label: 'World' }
		}
	]);

	let edges = $state.raw([
		{ id: 'e1-2', source: '1', target: '2', type: 'smoothstep', label: 'to the' }
	]);
</script>

<div style:width="100vw" style:height="100vh">
	<SvelteFlow bind:nodes bind:edges {nodeTypes}fitView>
		<Background />
		<MiniMap />
		<Controls />
		<Panel>
			<h1>My Flow</h1>
		</Panel>
	</SvelteFlow>
</div>

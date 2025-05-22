<script lang="ts">
	import { SvelteFlow, MiniMap, Controls, Background, Panel } from '@xyflow/svelte';
	import type { Node, Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import familyData from '$lib/data/family.json';
	import type { FamilyData, FamilyMember } from '$lib/types/family';
	import MemberNode from '$lib/nodes/MemberNode.svelte';

	const nodeTypes = { memberUpdater: MemberNode };
    const { nodes: initialNodes, edges: initialEdges } = generateTree(familyData as FamilyData);

    let nodes = initialNodes;
    let edges = initialEdges;

	function generateTree(familyData: FamilyData) {
		const nodes: Node[] = [];
		const edges: Edge[] = [];

		familyData.forEach((person: FamilyMember, index: number) => {
			// Positioning logic: spread them out vertically
			const y = index * 200;
			const x = (index % 3) * 300;

			nodes.push({
				id: person.id,
				type: 'memberUpdater',
				position: { x, y },
				data: {
					label: person.name,
					birthYear: person.birthYear,
					isLiving: person.isLiving
				}
			});

			// Generate edges from parent to each child
			person.children?.forEach((childId: string) => {
				edges.push({
					id: `e${person.id}-${childId}`,
					source: person.id,
					target: childId,
					type: 'smoothstep',
					animated: false
				});
			});
		});

        return { nodes, edges };
	}
</script>

<div style:width="100vw" style:height="100vh">
	<SvelteFlow bind:nodes bind:edges {nodeTypes} fitView>
		<Background />
		<MiniMap />
		<Controls />
		<Panel>
			<h1>My Flow</h1>
		</Panel>
	</SvelteFlow>
</div>

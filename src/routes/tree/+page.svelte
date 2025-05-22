<script lang="ts">
	import { SvelteFlow, Controls, Background, Panel, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import familyData from '$lib/data/family.json';
	import type { FamilyData, FamilyMember } from '$lib/types/family';
	import MemberNode from '$lib/nodes/MemberNode.svelte';

	const nodeTypes = { memberUpdater: MemberNode };
    const { nodes: initialNodes, edges: initialEdges } = generateTree(familyData as FamilyData);

    let nodes = initialNodes;
    let edges = initialEdges;

	$: selectedNode = nodes.find(n => n.data.selected)?.id || null;

	function generateTree(familyData: FamilyData) {
		const nodes: Node[] = [];
		const edges: Edge[] = [];
		const generations: { [key: string]: string[] } = { '0': [] };
		const processed = new Set<string>();

		// First, find root nodes (nodes without parents)
		const childrenSet = new Set(
			familyData.flatMap(person => person.children || [])
		);
		const rootNodes = familyData
			.filter(person => !childrenSet.has(person.id))
			.map(person => person.id);

		// Add root nodes to generation 0
		generations['0'] = rootNodes;
		rootNodes.forEach(id => processed.add(id));

		// Build generations
		let currentGen = 0;
		while (generations[currentGen.toString()].length > 0) {
			generations[(currentGen + 1).toString()] = [];
			
			for (const parentId of generations[currentGen.toString()]) {
				const parent = familyData.find(p => p.id === parentId);
				if (parent?.children) {
					parent.children.forEach(childId => {
						if (!processed.has(childId)) {
							generations[(currentGen + 1).toString()].push(childId);
							processed.add(childId);
						}
					});
				}
			}
			
			currentGen++;
		}

		// Remove empty generations
		Object.keys(generations).forEach(gen => {
			if (generations[gen].length === 0) {
				delete generations[gen];
			}
		});

		// Create nodes with proper positioning
		Object.entries(generations).forEach(([generation, memberIds], genIndex) => {
			const y = genIndex * 250; // Vertical spacing between generations
			memberIds.forEach((id, indexInGen) => {
				const person = familyData.find(p => p.id === id);
				if (person) {
					const x = (indexInGen - (memberIds.length - 1) / 2) * 300; // Center nodes horizontally
					nodes.push({
						id: person.id,
						type: 'memberUpdater',
						position: { x, y },
						data: {
							label: person.name,
							birthYear: person.birthYear,
							isLiving: person.isLiving,
							selected: false
						}
					});
				}
			});
		});

		// Create edges
		familyData.forEach(person => {
			person.children?.forEach(childId => {
				if (childId) {
					edges.push({
						id: `e${person.id}-${childId}`,
						source: person.id,
						target: childId,
						type: 'smoothstep',
						animated: false
					});
				}
			});
		});

		return { nodes, edges };
	}

	function addNewMember() {
		const newId = (nodes.length + 1).toString();
		// Position new members at the top center
		const x = nodes.length > 0 
			? Math.max(...nodes.map(n => n.position.x)) + 300 
			: 0;
		const newNode = {
			id: newId,
			type: 'memberUpdater',
			position: { x, y: 0 }, // Place at top level
			data: {
				label: 'New Member',
				birthYear: new Date().getFullYear(),
				isLiving: true,
				selected: false
			}
		};
		nodes = [...nodes, newNode];
	}

	function connectNodes() {
		if (!selectedNode) return;
		
		const newId = (nodes.length + 1).toString();
		const parentNode = nodes.find(n => n.id === selectedNode);
		if (!parentNode) return;

		// Find all siblings
		const siblings = nodes.filter(n => 
			edges.some(e => e.source === selectedNode && e.target === n.id)
		);
		
		// Position new child centered below parent
		const y = parentNode.position.y + 250;
		const x = siblings.length > 0
			? Math.max(...siblings.map(n => n.position.x)) + 300
			: parentNode.position.x;
		
		const newNode = {
			id: newId,
			type: 'memberUpdater',
			position: { x, y },
			data: {
				label: 'New Child',
				birthYear: new Date().getFullYear(),
				isLiving: true,
				selected: false
			}
		};
		
		const newEdge = {
			id: `e${selectedNode}-${newId}`,
			source: selectedNode,
			target: newId,
			type: 'smoothstep',
			animated: false
		};
		
		// Deselect parent node
		nodes = nodes.map(n => ({
			...n,
			data: { ...n.data, selected: false }
		}));
		nodes = [...nodes, newNode];
		edges = [...edges, newEdge];
	}
</script>

<div style:width="100vw" style:height="100vh">
	<SvelteFlow 
		bind:nodes 
		bind:edges 
		{nodeTypes} 
		fitView
	>
		<Background />
		<Controls />
		<Panel position="top-right" class="controls">
			<div class="control-panel">
				<h3>Family Tree Editor</h3>
				<div class="instructions">
					<p>• Double-click any member to edit</p>
					<p>• Click a member to select it</p>
				</div>
				<div class="actions">
					<button on:click={addNewMember} class="primary">Add New Member</button>
					<button 
						on:click={connectNodes}
						disabled={!selectedNode}
						class="secondary"
					>
						Add Child to Selected
					</button>
				</div>
				{#if selectedNode}
					<div class="selection-info">
						<strong>Selected:</strong> {nodes.find(n => n.id === selectedNode)?.data.label}
					</div>
				{/if}
			</div>
		</Panel>
	</SvelteFlow>
</div>

<style>
	.control-panel {
		background: white;
		padding: 16px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 250px;
	}

	h3 {
		margin: 0;
		color: #333;
		border-bottom: 1px solid #eee;
		padding-bottom: 8px;
	}

	.instructions {
		font-size: 0.9em;
		color: #666;
	}

	.instructions p {
		margin: 4px 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	button {
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	button.primary {
		background: #007bff;
		color: white;
	}

	button.secondary {
		background: #6c757d;
		color: white;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.selection-info {
		background: #f8f9fa;
		padding: 8px;
		border-radius: 4px;
		font-size: 0.9em;
	}

	strong {
		color: #495057;
	}
</style>

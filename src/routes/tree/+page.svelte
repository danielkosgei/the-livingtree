<script lang="ts">
	import { SvelteFlow, Controls, Background, Panel, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { onMount } from 'svelte';

	import type { FamilyData, FamilyMember } from '$lib/types/family';
	import MemberNode from '$lib/nodes/MemberNode.svelte';
	import defaultFamilyData from '$lib/data/family.json';

	const nodeTypes = { memberUpdater: MemberNode };

	// Family data store
	let familyData: FamilyData = [];
	let nodes: Node[] = [];
	let edges: Edge[] = [];

	onMount(() => {
		// Load from localStorage or use default data
		const savedData = localStorage.getItem('familyTreeData');
		if (savedData) {
			familyData = JSON.parse(savedData);
		} else {
			familyData = defaultFamilyData as FamilyData;
		}
		const { nodes: initialNodes, edges: initialEdges } = generateTree(familyData);
		nodes = initialNodes;
		edges = initialEdges;

		// Listen for member updates
		document.addEventListener('memberUpdate', ((e: CustomEvent) => {
			const { id, updates } = e.detail;
			updateMember(id, updates);
		}) as EventListener);

		return () => {
			document.removeEventListener('memberUpdate', ((e: CustomEvent) => {
				const { id, updates } = e.detail;
				updateMember(id, updates);
			}) as EventListener);
		};
	});

	// Save changes to localStorage
	$: {
		if (familyData.length > 0) {
			localStorage.setItem('familyTreeData', JSON.stringify(familyData));
		}
	}

	$: selectedNode = nodes.find(n => n.data.selected)?.id || null;

	function generateTree(familyData: FamilyData) {
		const nodes: Node[] = [];
		const edges: Edge[] = [];
		const generations: { [key: string]: string[] } = { '0': [] };
		const processed = new Set<string>();
		const spouseNodes = new Map<string, Node>();
		const NODE_SPACING = 300;  // Consistent spacing for all nodes

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
			const y = genIndex * 250;
			const totalWidth = memberIds.reduce((acc, id) => {
				const person = familyData.find(p => p.id === id);
				return acc + NODE_SPACING * (person?.spouse ? 2 : 1);
			}, 0);
			const startX = -totalWidth / 2;

			let currentX = startX;
			memberIds.forEach((id, indexInGen) => {
				const person = familyData.find(p => p.id === id);
				if (person) {
					const node = {
						id: person.id,
						type: 'memberUpdater',
						position: { x: currentX, y },
						data: {
							label: person.name,
							birthYear: person.birthYear,
							isLiving: person.isLiving,
							selected: false
						}
					};
					nodes.push(node);

					// If person has a spouse, create spouse node and marriage edge
					if (person.spouse) {
						const spouseId = `spouse-${person.id}`;
						const spouseNode = {
							id: spouseId,
							type: 'memberUpdater',
							position: { x: currentX + NODE_SPACING, y },
							data: {
								label: person.spouse.name,
								birthYear: person.spouse.birthYear,
								isLiving: person.spouse.isLiving,
								selected: false,
								isSpouse: true
							}
						};
						nodes.push(spouseNode);
						spouseNodes.set(spouseId, spouseNode);

						edges.push({
							id: `marriage-${person.id}-${spouseId}`,
							source: person.id,
							target: spouseId,
							type: 'smoothstep',
							animated: true,
							sourceHandle: 'spouse-out',
							targetHandle: 'spouse-in'
						});

						currentX += NODE_SPACING;  // Add spacing for spouse
					}

					currentX += NODE_SPACING;  // Standard spacing to next family member
				}
			});
		});

		// Create parent-child edges
		familyData.forEach(person => {
			person.children?.forEach(childId => {
				if (childId) {
					edges.push({
						id: `e${person.id}-${childId}`,
						source: person.id,
						target: childId,
						type: 'smoothstep',
						animated: false,
						sourceHandle: 'bottom',
						targetHandle: 'top'
					});
				}
			});
		});

		return { nodes, edges };
	}

	function updateMember(memberId: string, updates: Partial<FamilyMember>) {
		familyData = familyData.map(member => 
			member.id === memberId ? { ...member, ...updates } : member
		);
		const { nodes: updatedNodes, edges: updatedEdges } = generateTree(familyData);
		nodes = updatedNodes;
		edges = updatedEdges;
	}

	function addChild() {
		if (!selectedNode) return;
		
		const parent = familyData.find(m => m.id === selectedNode);
		if (!parent) return;

		const newId = Date.now().toString(); // Simple unique ID
		const newMember: FamilyMember = {
			id: newId,
			name: 'New Member',
			birthYear: new Date().getFullYear(),
			isLiving: true,
			children: []
		};

		// Add to family data
		familyData = [...familyData, newMember];
		
		// Update parent's children
		familyData = familyData.map(member => 
			member.id === selectedNode 
				? { ...member, children: [...(member.children || []), newId] }
				: member
		);

		// Regenerate tree
		const { nodes: updatedNodes, edges: updatedEdges } = generateTree(familyData);
		nodes = updatedNodes;
		edges = updatedEdges;
	}

	function addSpouse() {
		if (!selectedNode) return;
		
		const member = familyData.find(m => m.id === selectedNode);
		if (!member || member.spouse) return;

		const spouseId = `spouse-${Date.now()}`;
		const spouse = {
			name: 'New Spouse',
			birthYear: new Date().getFullYear(),
			isLiving: true
		};

		// Update member with spouse
		familyData = familyData.map(m => 
			m.id === selectedNode 
				? { ...m, spouse }
				: m
		);

		// Regenerate tree
		const { nodes: updatedNodes, edges: updatedEdges } = generateTree(familyData);
		nodes = updatedNodes;
		edges = updatedEdges;
	}

	function exportData() {
		const dataStr = JSON.stringify(familyData, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'family-tree.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function resetToDefault() {
		if (confirm('Reset to default family tree? This will erase your changes.')) {
			familyData = familyData as FamilyData;
			localStorage.removeItem('familyTreeData');
			const { nodes: updatedNodes, edges: updatedEdges } = generateTree(familyData);
			nodes = updatedNodes;
			edges = updatedEdges;
		}
	}

	function importData(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const importedData = JSON.parse(e.target?.result as string);
				familyData = importedData;
				const { nodes: updatedNodes, edges: updatedEdges } = generateTree(familyData);
				nodes = updatedNodes;
				edges = updatedEdges;
				localStorage.setItem('familyTreeData', JSON.stringify(familyData));
			} catch (error) {
				alert('Invalid family tree file. Please make sure it\'s a valid JSON file.');
			}
		};
		reader.readAsText(file);
		// Reset input so the same file can be imported again if needed
		input.value = '';
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
				{#if selectedNode}
					<div class="selection-info">
						<strong>Selected:</strong> {nodes.find(n => n.id === selectedNode)?.data.label}
						<div class="button-group">
							<button 
								onclick={addChild}
								class="primary"
							>
								Add Child
							</button>
							<button 
								onclick={addSpouse}
								class="primary"
							>
								Add Spouse
							</button>
						</div>
					</div>
				{:else}
					<div class="instructions">
						<p>Click a member to select it</p>
					</div>
				{/if}
				<div class="data-controls">
					<div class="import-wrapper">
						<input
							type="file"
							id="import-file"
							accept=".json"
							onchange={importData}
							class="hidden"
						/>
						<button 
							onclick={() => document.getElementById('import-file')?.click()}
							class="secondary"
						>
							Import Tree
						</button>
					</div>
					<button 
						onclick={exportData}
						class="secondary"
					>
						Export Tree
					</button>
					<button 
						onclick={resetToDefault}
						class="secondary warning"
					>
						Reset to Default
					</button>
				</div>
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
		min-width: 200px;
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
		text-align: center;
	}

	.instructions p {
		margin: 4px 0;
	}

	.selection-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 0.9em;
	}

	.button-group {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.import-wrapper {
		position: relative;
		display: inline-block;
	}

	.hidden {
		display: none;
	}

	.data-controls {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid #eee;
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

	button.primary:hover {
		background: #0056b3;
	}

	button.secondary {
		background: #e9ecef;
		color: #495057;
	}

	button.secondary:hover {
		background: #dee2e6;
	}

	button.warning {
		color: #dc3545;
	}

	button.warning:hover {
		background: #dc3545;
		color: white;
	}

	strong {
		color: #495057;
	}

	:global(.svelte-flow__edge-path) {
		stroke: #666;
		stroke-width: 1;
	}

	:global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
		stroke: #FF69B4;
		stroke-width: 2;
	}
</style>

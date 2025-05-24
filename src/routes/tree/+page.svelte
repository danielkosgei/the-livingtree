<script lang="ts">
	import { SvelteFlow, Controls, Background, MiniMap, Panel, type Node, type Edge, type ColorMode } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { onMount } from 'svelte';

	import type { FamilyData, FamilyMember } from '$lib/types/family';
	import MemberNode from '$lib/nodes/MemberNode.svelte';
	import defaultFamilyData from '$lib/data/family.json';

	const nodeTypes: Record<string, any> = { memberUpdater: MemberNode };

	// Family data store
	let familyData: FamilyData = $state<FamilyData>([]);
	let nodes = $state<Node[]>([]);
	let edges = $state<Edge[]>([]);
	let flowInstance = $state<SvelteFlow | undefined>(undefined);

	// Color Mode
	//let colorMode = $state<ColorMode>('system');

	onMount(() => {
		// Load from localStorage or use default data
		const url = new URL(window.location.href);
		const sharedData = url.searchParams.get('d') || url.searchParams.get('data'); // Support both old and new parameter names

		if (sharedData) {
			try {
				// Decompress the data
				const decompressedData = decodeURIComponent(
					atob(sharedData
						.replace(/-/g, '+')
						.replace(/_/g, '/')
					)
				);
				const compactData = JSON.parse(decompressedData);
				
				// Convert back to full format
				familyData = compactData.map(member => {
					const base: FamilyMember = {
						id: member[0],
						name: member[1],
						birthYear: member[2] || null,
						isLiving: member[3] === 1
					};

					// Add children if they exist
					if (member[4]) {
						base.children = member[4].map(child => {
							if (typeof child === 'string') {
								const [childId, otherParentId] = child.split(':');
								return {
									id: childId,
									...(otherParentId && { otherParentId })
								};
							}
							return { id: child };
						});
					}

					// Add spouses if they exist
					if (member[5]) {
						base.spouses = member[5].map(spouse => {
							const [id, name, birthYear, isLiving, marriageYear, divorceYear, isCurrent] = spouse.split(':');
							return {
								id,
								name,
								...(birthYear && { birthYear: parseInt(birthYear) }),
								isLiving: parseInt(isLiving) === 1,
								...(marriageYear && { marriageYear: parseInt(marriageYear) }),
								...(divorceYear && { divorceYear: parseInt(divorceYear) }),
								isCurrent: parseInt(isCurrent) === 1
							};
						});
					}

					return base;
				});
			} catch (error) {
				// If shared data is invalid, load from localStorage or default
				const savedData = localStorage.getItem('familyTreeData');
				if (savedData) {
					familyData = JSON.parse(savedData);
				} else {
					familyData = defaultFamilyData as FamilyData;
				}
			}
		} else {
			// No shared data, load from localStorage or default
			const savedData = localStorage.getItem('familyTreeData');
			if (savedData) {
				familyData = JSON.parse(savedData);
			} else {
				familyData = defaultFamilyData as FamilyData;
			}
		}
		const { nodes: initialNodes, edges: initialEdges } = generateTree(familyData);
		nodes = initialNodes;
		edges = initialEdges;

		// Listen for member updates
		document.addEventListener('memberUpdate', ((e: CustomEvent) => {
			const { id, updates } = e.detail;
			updateMember(id, updates);
		}) as EventListener);

		// Listen for node selection
		document.addEventListener('nodeSelect', ((e: CustomEvent) => {
			const { id, selected } = e.detail;
			nodes = nodes.map(n => ({
				...n,
				data: { ...n.data, selected: n.id === id ? selected : false }
			}));
		}) as EventListener);

		return () => {
			document.removeEventListener('memberUpdate', ((e: CustomEvent) => {
				const { id, updates } = e.detail;
				updateMember(id, updates);
			}) as EventListener);
			document.removeEventListener('nodeSelect', ((e: CustomEvent) => {
				const { id, selected } = e.detail;
				nodes = nodes.map(n => ({
					...n,
					data: { ...n.data, selected: n.id === id ? selected : false }
				}));
			}) as EventListener);
		};
	});

	// Save changes to localStorage
	$effect(() => {
		if (familyData.length > 0) {
			localStorage.setItem('familyTreeData', JSON.stringify(familyData));
		}
	});

	let selectedNode = $derived(nodes.find(n => n.data.selected)?.id || null);

	function generateTree(familyData: FamilyData) {
		const nodes: Node[] = [];
		const edges: Edge[] = [];
		const generations: { [key: string]: string[] } = { '0': [] };
		const processed = new Set<string>();
		const spouseNodes = new Map<string, Node>();
		const NODE_SPACING = 300;  // Consistent spacing for all nodes
		const SIBLING_SPACING = 100; // Additional spacing between siblings
		const nodePositions = new Map<string, { x: number; y: number; width: number }>();

		// First, find root nodes (nodes without parents)
		const childrenSet = new Set(
			familyData.flatMap(person => 
				(person.children || []).map(child => child.id)
			)
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
					parent.children.forEach(child => {
						if (!processed.has(child.id)) {
							generations[(currentGen + 1).toString()].push(child.id);
							processed.add(child.id);
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

		// Calculate required width for each member including their spouses and spacing
		function calculateMemberWidth(person: FamilyMember | undefined): number {
			if (!person) return NODE_SPACING;
			const spouseCount = person.spouses?.length || 0;
			// Width includes the member node, spouse nodes, and spacing for spouses on both sides
			return NODE_SPACING * (1 + spouseCount) + SIBLING_SPACING;
		}

		// Create nodes with proper positioning
		Object.entries(generations).forEach(([generation, memberIds], genIndex) => {
			const y = genIndex * 250;

			// First pass: calculate total width needed for the generation
			const totalWidth = memberIds.reduce((acc, id) => {
				const person = familyData.find(p => p.id === id);
				return acc + calculateMemberWidth(person);
			}, 0);

			let currentX = -totalWidth / 2;

			// Second pass: create and position nodes
			memberIds.forEach((id, indexInGen) => {
				const person = familyData.find(p => p.id === id);
				if (!person) return;

				// Calculate the center position for this member
				const memberWidth = calculateMemberWidth(person);
				const memberCenterX = currentX + memberWidth / 2;

				// Store member position
				nodePositions.set(id, {
					x: memberCenterX,
					y,
					width: memberWidth
				});

				// Create member node
				const node = {
					id: person.id,
					type: 'memberUpdater',
					position: { x: memberCenterX, y },
					data: {
						label: person.name,
						birthYear: person.birthYear,
						isLiving: person.isLiving,
						selected: false
					}
				};
				nodes.push(node);

				// Create nodes and edges for each spouse
				if (person.spouses?.length) {
					let leftSpouses = 0;
					let rightSpouses = 0;

					person.spouses.forEach((spouse, spouseIndex) => {
						const isLeftSpouse = spouseIndex % 2 === 0;
						const spouseId = spouse.id || `spouse-${person.id}-${spouseIndex}`;

						// Calculate spouse position
						let spouseOffset;
						if (isLeftSpouse) {
							leftSpouses++;
							spouseOffset = -leftSpouses;
						} else {
							rightSpouses++;
							spouseOffset = rightSpouses;
						}

						const spouseNode = {
							id: spouseId,
							type: 'memberUpdater',
							position: { 
								x: memberCenterX + NODE_SPACING * spouseOffset,
								y 
							},
							data: {
								label: spouse.name,
								birthYear: spouse.birthYear,
								isLiving: spouse.isLiving,
								selected: false,
								isSpouse: true,
								isCurrent: spouse.isCurrent,
								marriageYear: spouse.marriageYear,
								divorceYear: spouse.divorceYear
							}
						};
						nodes.push(spouseNode);
						spouseNodes.set(spouseId, spouseNode);

						if (isLeftSpouse) {
							edges.push({
								id: `marriage-${person.id}-${spouseId}`,
								source: spouseId,
								target: person.id,
								type: 'smoothstep',
								animated: spouse.isCurrent,
								sourceHandle: 'spouse-out-right',
								targetHandle: 'spouse-in-left',
								style: spouse.isCurrent ? '' : 'stroke-dasharray: 5,5'
							});
						} else {
							edges.push({
								id: `marriage-${person.id}-${spouseId}`,
								source: person.id,
								target: spouseId,
								type: 'smoothstep',
								animated: spouse.isCurrent,
								sourceHandle: 'spouse-out-right',
								targetHandle: 'spouse-in-left',
								style: spouse.isCurrent ? '' : 'stroke-dasharray: 5,5'
							});
						}
					});
				}

				// Update currentX for next member
				currentX += memberWidth;
			});
		});

		// Create parent-child edges
		familyData.forEach(person => {
			person.children?.forEach(child => {
				if (child.id) {
					// Edge from main parent to child
					edges.push({
						id: `e${person.id}-${child.id}`,
						source: person.id,
						target: child.id,
						type: 'smoothstep',
						animated: false,
						sourceHandle: 'bottom',
						targetHandle: 'top'
					});

					// If there's a spouse parent, add edge from spouse to child
					if (child.otherParentId) {
						edges.push({
							id: `e${child.otherParentId}-${child.id}`,
							source: child.otherParentId,
							target: child.id,
							type: 'smoothstep',
							animated: false,
							sourceHandle: 'bottom',
							targetHandle: 'top',
							style: 'stroke: #FF69B4; stroke-width: 1;' // Style to match spouse color
						});
					}
				}
			});
		});

		return { nodes, edges };
	}

	function updateMember(memberId: string, updates: Partial<FamilyMember> & { isCurrent?: boolean }) {
		// Check if this is a spouse node
		const isSpouseNode = memberId.startsWith('spouse-');
		
		if (isSpouseNode) {
			// Extract the parent ID from the spouse ID (format: spouse-parentId-timestamp)
			const [, parentId] = memberId.split('-');
			
			familyData = familyData.map(member => {
				if (member.id === parentId && member.spouses) {
					return {
						...member,
						spouses: member.spouses.map(spouse => 
							spouse.id === memberId
								? { ...spouse, ...updates }
								: spouse.isCurrent && updates.isCurrent
									? { ...spouse, isCurrent: false }  // Set other spouses as not current if this one is marked current
									: spouse
						)
					};
				}
				return member;
			});
		} else {
			// Regular member update
			familyData = familyData.map(member => 
				member.id === memberId ? { ...member, ...updates } : member
			);
		}

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
			isLiving: true
		};

		// Add to family data
		familyData = [...familyData, newMember];
		
		// Update parent's children
		familyData = familyData.map(member => 
			member.id === selectedNode 
				? { 
					...member, 
					children: [...(member.children || []), { 
						id: newId,
						// If parent has a current spouse, set them as other parent
						otherParentId: member.spouses?.find(s => s.isCurrent)?.id
					}] 
				}
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
		if (!member) return;

		const spouseId = `spouse-${member.id}-${Date.now()}`;
		const newSpouse = {
			id: spouseId,
			name: 'New Spouse',
			birthYear: new Date().getFullYear(),
			isLiving: true,
			isCurrent: true,
			marriageYear: new Date().getFullYear()
		};

		// If this is being set as current spouse, update any existing children
		// to have this spouse as their other parent
		if (newSpouse.isCurrent) {
			member.children?.forEach(child => {
				if (!child.otherParentId) {
					updateChildParent(child.id, member.id, spouseId);
				}
			});
		}

		// Update member with new spouse
		familyData = familyData.map(m =>
			m.id === selectedNode
				? {
					...m,
					spouses: [...(m.spouses || []).map(s => ({
						...s,
						isCurrent: false // Set all existing spouses as not current
					})), newSpouse]
				}
				: m
		);

		// Regenerate the tree
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
			familyData = defaultFamilyData as FamilyData;
			localStorage.removeItem('familyTreeData');
			const { nodes: updatedNodes, edges: updatedEdges } = generateTree(familyData);
			nodes = updatedNodes;
			edges = updatedEdges;
		}
	}

	function createNewTree() {
		if (confirm('Start a new family tree from scratch? This will erase your current tree.')) {
			// Create a single root member
			const rootId = Date.now().toString();
			const newMember: FamilyMember = {
				id: rootId,
				name: 'First Member',
				birthYear: new Date().getFullYear(),
				isLiving: true
			};
			
			familyData = [newMember];
			localStorage.setItem('familyTreeData', JSON.stringify(familyData));
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

	async function shareAsLink() {
		try {
			// Convert family data to a highly compressed format
			type CompactMember = [
				string,              // id
				string,              // name
				string | number,     // birthYear
				number,             // isLiving
				(string | string[])?, // children
				string[]?            // spouses
			];

			const compactData = familyData.map((member: FamilyMember) => {
				// Create a minimal representation
				const base: CompactMember = [
					member.id,                    // 0: id
					member.name,                  // 1: name
					member.birthYear || '',       // 2: birth year
					member.isLiving ? 1 : 0       // 3: is living
				];

				// Add children if they exist
				if (member.children?.length) {
					base[4] = member.children.map((child: { id: string; otherParentId?: string }) => 
						child.otherParentId 
							? `${child.id}:${child.otherParentId}`
							: child.id
					);
				}

				// Add spouses if they exist
				if (member.spouses?.length) {
					base[5] = member.spouses.map((spouse: {
						id: string;
						name: string;
						birthYear?: number | null;
						isLiving?: boolean;
						marriageYear?: number;
						divorceYear?: number;
						isCurrent?: boolean;
					}) => [
						spouse.id,
						spouse.name,
						spouse.birthYear || '',
						spouse.isLiving ? 1 : 0,
						spouse.marriageYear || '',
						spouse.divorceYear || '',
						spouse.isCurrent ? 1 : 0
					].join(':'));
				}

				return base;
			});
			
			// Convert to JSON and compress
			const jsonStr = JSON.stringify(compactData);
			const compressedData = btoa(encodeURIComponent(jsonStr))
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '');
			
			// Create full URL
			const url = new URL(window.location.href);
			url.searchParams.set('d', compressedData); // Use shorter parameter name
			const fullUrl = url.toString();
			
			// Copy to clipboard
			await navigator.clipboard.writeText(fullUrl)
				.then(() => alert('Share link copied to clipboard!'))
				.catch(() => {
					// Fallback if clipboard API fails
					prompt('Copy this share link:', fullUrl);
				});
		} catch (error) {
			console.error('Error creating share link:', error);
			alert('Failed to generate share link. Please try again.');
		}
	}

	// Add function to update child's other parent
	function updateChildParent(childId: string, parentId: string, spouseId: string | undefined) {
		familyData = familyData.map(member => {
			if (member.id === parentId) {
				return {
					...member,
					children: member.children?.map(child => 
						child.id === childId
							? { ...child, otherParentId: spouseId }
							: child
					)
				};
			}
			return member;
		});

		const { nodes: updatedNodes, edges: updatedEdges } = generateTree(familyData);
		nodes = updatedNodes;
		edges = updatedEdges;
	}
</script>

<div style:width="100vw" style:height="100vh">
	<SvelteFlow 
		proOptions={{ hideAttribution: true}}
		bind:nodes 
		bind:edges 
		bind:this={flowInstance}
		{nodeTypes} 
		fitView
	>
		<Background />
		<MiniMap 
			nodeColor={(node) => {
				return node.data?.isSpouse ? '#FF69B4' : '#f9f9f9';
			}}
			nodeStrokeColor={(node) => {
				return node.data?.isSpouse ? '#FF69B4' : '#ccc';
			}}
		/>
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
					<div class="button-group">
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
								Import
							</button>
						</div>
						<button 
							onclick={exportData}
							class="secondary"
						>
							Export JSON
						</button>
					</div>
					<div class="button-group">
						<button 
							onclick={shareAsLink}
							class="secondary"
						>
							Share Link
						</button>
					</div>
					<button 
						onclick={createNewTree}
						class="secondary create-new"
					>
						Create New Tree
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
	:global(.svelte-flow) {
		--xy-edge-stroke-default: #555;
		--xy-edge-stroke-width-default: 1.5;
		--xy-minimap-background-color-default: #fff;
		--xy-background-pattern-dot-color-default: #e9ecef;
		--xy-controls-button-background-color-default: #fff;
		--xy-controls-button-border-color-default: #ddd;
	}

	:global(.svelte-flow__edge-path) {
		stroke: #555;
		stroke-width: 1.5;
	}

	:global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
		stroke: #FF69B4;
		stroke-width: 2;
	}

	:global(.svelte-flow__minimap) {
		border: 1px solid #ddd;
	}

	:global(.svelte-flow__controls) {
		border: 1px solid #ddd;
		background: white;
	}

	:global(.svelte-flow__handle) {
		width: 8px;
		height: 8px;
		background-color: #FF69B4;
		border: 2px solid white;
	}

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
	}

	.button-group button {
		flex: 1;
	}

	.import-wrapper {
		position: relative;
		display: inline-block;
	}

	.hidden {
		display: none;
	}

	.data-controls {
		display: flex;
		flex-direction: column;
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

	button.create-new {
		background: #28a745;
		color: white;
	}

	button.create-new:hover {
		background: #218838;
	}

	strong {
		color: #495057;
	}
</style>

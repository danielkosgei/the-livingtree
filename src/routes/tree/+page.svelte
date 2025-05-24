<script lang="ts">
	import { SvelteFlow, Controls, Background, Panel, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { onMount } from 'svelte';
	import { toPng } from 'html-to-image';

	import type { FamilyData, FamilyMember } from '$lib/types/family';
	import MemberNode from '$lib/nodes/MemberNode.svelte';
	import defaultFamilyData from '$lib/data/family.json';

	const nodeTypes: Record<string, any> = { memberUpdater: MemberNode };

	// Family data store
	let familyData: FamilyData = [];
	let nodes: Node[] = [];
	let edges: Edge[] = [];
	let flowInstance: SvelteFlow;

	onMount(() => {
		// Load from localStorage or use default data
		const url = new URL(window.location.href);
		const sharedData = url.searchParams.get('data');

		if (sharedData) {
			try {
				const jsonStr = decodeURIComponent(atob(sharedData));
				familyData = JSON.parse(jsonStr);
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

	async function exportAsPNG() {
		// Get the flow element
		const flowElement = document.querySelector('.svelte-flow') as HTMLElement;
		if (!flowElement) return;

		try {
			// Center the view
			if (flowInstance) {
				flowInstance.fitView();
				// Wait for the view transition
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			// Convert to PNG
			const dataUrl = await toPng(flowElement, {
				backgroundColor: 'white',
				pixelRatio: 2,
				style: {
					width: '100%',
					height: '100%'
				}
			});

			// Download the image
			const link = document.createElement('a');
			link.download = 'family-tree.png';
			link.href = dataUrl;
			link.click();
		} catch (error) {
			alert('Failed to export as PNG. Please try again.');
		}
	}

	async function shareAsLink() {
		try {
			// Convert family data to base64
			const jsonStr = JSON.stringify(familyData);
			const base64Data = btoa(encodeURIComponent(jsonStr));
			
			// Create full URL
			const url = new URL(window.location.href);
			url.searchParams.set('data', base64Data);
			const longUrl = url.toString();

			// Create short URL using TinyURL's API
			const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
			if (!response.ok) throw new Error('Failed to create short URL');
			
			const shortUrl = await response.text();
			
			// Copy to clipboard
			navigator.clipboard.writeText(shortUrl)
				.then(() => alert('Share link copied to clipboard!'))
				.catch(() => {
					// Fallback if clipboard API fails
					prompt('Copy this share link:', shortUrl);
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
		bind:nodes 
		bind:edges 
		bind:this={flowInstance}
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
							onclick={exportAsPNG}
							class="secondary"
						>
							Save as PNG
						</button>
						<button 
							onclick={shareAsLink}
							class="secondary"
						>
							Share Link
						</button>
					</div>
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

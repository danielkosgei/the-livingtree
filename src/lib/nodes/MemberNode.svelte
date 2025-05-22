<script lang="ts">
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';
  import type { FamilyMember } from '$lib/types/family';
 
  interface NodeData {
    label: string;
    birthYear: number;
    isLiving: boolean;
    selected?: boolean;
    isSpouse?: boolean;
  }

  let { id, data } = $props() as NodeProps & { data: NodeData };
  let { updateNodeData } = useSvelteFlow();

  function handleClick() {
    if (!data.isSpouse) {
      updateNodeData(id, { ...data, selected: !data.selected });
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleClick();
    }
  }
</script>

<div 
  class="family-node" 
  class:selected={data.selected}
  class:spouse={data.isSpouse}
  onclick={handleClick}
  onkeydown={handleKeydown}
  tabindex="0"
  role="button"
>
  <div class="name">{data.label}</div>
  <div class="details">Born: {data.birthYear}</div>
  <div class="details">{data.isLiving ? 'Living' : 'Deceased'}</div>
</div>

<!-- Parent-child connection handles -->
<Handle 
  type="target" 
  position={Position.Top} 
  id="top"
/>
<Handle 
  type="source" 
  position={Position.Bottom} 
  id="bottom"
/>

<!-- Marriage connection handles -->
<Handle 
  type="source" 
  position={Position.Right} 
  id="spouse-out"
  style="background: #FF69B4;"
/>
<Handle 
  type="target" 
  position={Position.Left} 
  id="spouse-in"
  style="background: #FF69B4;"
/>

<style>
  .family-node {
    padding: 10px;
    background: #f9f9f9;
    border: 2px solid #ccc;
    border-radius: 8px;
    width: 180px;
    text-align: center;
    font-family: sans-serif;
    cursor: pointer;
  }

  .family-node.spouse {
    border-color: #FF69B4;
    background: #fff0f5;
  }

  .family-node.selected {
    border-color: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
  }

  .name {
    font-weight: bold;
    font-size: 1.2em;
    margin-bottom: 5px;
  }

  .details {
    font-size: 0.9em;
    color: #444;
  }

  :global(.family-node :where(.svelte-flow__handle)) {
    width: 8px;
    height: 8px;
    background: #555;
  }

  :global(.family-node :where(.svelte-flow__handle-right, .svelte-flow__handle-left)) {
    top: 50%;
  }
</style>
<script lang="ts">
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';
 
  let { id, data }: NodeProps = $props();
 
  let { updateNodeData } = useSvelteFlow();

  // Default values if not provided
  const label = data.label ?? 'Unnamed';
  const birthYear = data.birthYear ?? 1950;
  const isLiving = data.isLiving ?? true;
</script>
 
<div class="family-node">
  <div class="name">{label}</div>
  <div class="details">Born: {birthYear}</div>
  <div class="details">{isLiving ? 'Living' : 'Deceased'}</div>
</div>
<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />
<Handle type="target" position={Position.Left} />
<Handle type="source" position={Position.Right} />

<style>
  .family-node {
    padding: 10px;
    background: #f9f9f9;
    border: 2px solid #ccc;
    border-radius: 8px;
    width: 220px;
    text-align: center;
    font-family: sans-serif;
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
</style>
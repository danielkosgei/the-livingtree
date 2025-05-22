<script lang="ts">
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';
  import type { FamilyMember } from '$lib/types/family';
 
  let { id, data }: NodeProps = $props();
  let { updateNodeData, deleteElements } = useSvelteFlow();

  let isEditing = false;
  let editData = {
    label: data?.label as string ?? 'Unnamed',
    birthYear: data?.birthYear as number ?? 1950,
    isLiving: data?.isLiving as boolean ?? true
  };

  function toggleEdit() {
    isEditing = !isEditing;
    if (!isEditing) {
      updateNodeData(id, { ...data, ...editData });
    }
  }

  function handleDelete() {
    deleteElements({ nodes: [{ id }] });
  }

  function handleClick() {
    if (!isEditing) {
      updateNodeData(id, { ...data, selected: !data.selected });
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleClick();
    }
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      toggleEdit();
    }
  }
</script>
 
<div 
  class="family-node" 
  class:editing={isEditing}
  class:selected={data.selected}
  onclick={handleClick}
  onkeydown={handleKeydown}
  tabindex="0"
  role="button"
>
  {#if isEditing}
    <div class="edit-form">
      <input 
        type="text" 
        bind:value={editData.label} 
        placeholder="Name"
      />
      <input 
        type="number" 
        bind:value={editData.birthYear} 
        placeholder="Birth Year"
      />
      <label>
        <input 
          type="checkbox" 
          bind:checked={editData.isLiving} 
        />
        Living
      </label>
      <div class="buttons">
        <button onclick={toggleEdit}>Save</button>
        <button class="delete" onclick={handleDelete}>Delete</button>
      </div>
    </div>
  {:else}
    <div 
      class="view-mode" 
      ondblclick={toggleEdit}
      onkeydown={handleEditKeydown}
      role="button" 
      tabindex="0"
    >
      <div class="name">{editData.label}</div>
      <div class="details">Born: {editData.birthYear}</div>
      <div class="details">{editData.isLiving ? 'Living' : 'Deceased'}</div>
    </div>
  {/if}
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
    cursor: pointer;
  }

  .family-node.editing {
    background: #fff;
    border-color: #007bff;
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

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  input[type="text"],
  input[type="number"] {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
  }

  button {
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    background: #007bff;
    color: white;
    cursor: pointer;
  }

  button.delete {
    background: #dc3545;
  }

  .view-mode {
    cursor: pointer;
  }
</style>
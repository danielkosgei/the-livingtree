<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { FamilyMember } from '$lib/types/family';
 
  interface NodeData {
    label: string;
    birthYear: number;
    isLiving: boolean;
    selected?: boolean;
    isSpouse?: boolean;
    isCurrent?: boolean;
    marriageYear?: number;
    divorceYear?: number;
  }

  let { id, data } = $props() as NodeProps & { data: NodeData };

  let isEditing = $state(false);
  let editName = $state(data.label);
  let editBirthYear = $state(data.birthYear);
  let editIsLiving = $state(data.isLiving);
  let editMarriageYear = $state(data.marriageYear || new Date().getFullYear());
  let editDivorceYear = $state(data.divorceYear);
  let editIsCurrent = $state(data.isCurrent || false);

  function handleClick() {
    if (!data.isSpouse) {
      const event = new CustomEvent('nodeSelect', {
        detail: { id, selected: !data.selected },
        bubbles: true
      });
      document.dispatchEvent(event);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (isEditing) {
        saveChanges();
      } else {
        handleClick();
      }
    } else if (e.key === 'Escape' && isEditing) {
      cancelEdit();
    }
  }

  function startEdit() {
    isEditing = true;
    editName = data.label;
    editBirthYear = data.birthYear;
    editIsLiving = data.isLiving;
    if (data.isSpouse) {
        editMarriageYear = data.marriageYear || new Date().getFullYear();
        editDivorceYear = data.divorceYear;
        editIsCurrent = data.isCurrent || false;
    }
  }

  function saveChanges() {
    const updates = {
        name: editName,
        birthYear: editBirthYear,
        isLiving: editIsLiving
    };

    if (data.isSpouse) {
        Object.assign(updates, {
            marriageYear: editMarriageYear,
            divorceYear: editDivorceYear,
            isCurrent: editIsCurrent
        });
    }

    const event = new CustomEvent('memberUpdate', {
        detail: { id, updates },
        bubbles: true
    });
    document.dispatchEvent(event);
    isEditing = false;
  }

  function cancelEdit() {
    isEditing = false;
    editName = data.label;
    editBirthYear = data.birthYear;
    editIsLiving = data.isLiving;
    if (data.isSpouse) {
        editMarriageYear = data.marriageYear || new Date().getFullYear();
        editDivorceYear = data.divorceYear;
        editIsCurrent = data.isCurrent || false;
    }
  }
</script>

<div 
  class="family-node" 
  class:selected={data.selected}
  class:spouse={data.isSpouse}
  class:editing={isEditing}
  onclick={isEditing ? undefined : handleClick}
  onkeydown={handleKeydown}
  tabindex="0"
  role="button"
>
  {#if isEditing}
    <div class="edit-form">
      <input
        type="text"
        bind:value={editName}
        placeholder="Name"
        onclick={e => e.stopPropagation()}
      />
      <input
        type="number"
        bind:value={editBirthYear}
        placeholder="Birth Year"
        onclick={e => e.stopPropagation()}
      />
      <label class="living-toggle">
        <input
          type="checkbox"
          bind:checked={editIsLiving}
          onclick={e => e.stopPropagation()}
        />
        Living
      </label>
      {#if data.isSpouse}
          <input
              type="number"
              bind:value={editMarriageYear}
              placeholder="Marriage Year"
              onclick={e => e.stopPropagation()}
          />
          <input
              type="number"
              bind:value={editDivorceYear}
              placeholder="Divorce Year"
              onclick={e => e.stopPropagation()}
          />
          <label class="current-toggle">
              <input
                  type="checkbox"
                  bind:checked={editIsCurrent}
                  onclick={e => e.stopPropagation()}
              />
              Current Spouse
          </label>
      {/if}
      <div class="edit-buttons">
        <button 
          class="save" 
          onclick={e => {
            e.stopPropagation();
            saveChanges();
          }}
        >
          Save
        </button>
        <button 
          class="cancel" 
          onclick={e => {
            e.stopPropagation();
            cancelEdit();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <div class="name">{data.label}</div>
    <div class="details">Born: {data.birthYear}</div>
    <div class="details">{data.isLiving ? 'Living' : 'Deceased'}</div>
    {#if data.isSpouse}
        <div class="marriage-details">
            {#if data.marriageYear}
                <div class="details">Married: {data.marriageYear}</div>
            {/if}
            {#if data.divorceYear}
                <div class="details">Divorced: {data.divorceYear}</div>
            {/if}
            {#if data.isCurrent}
                <div class="current-spouse">Current Spouse</div>
            {/if}
        </div>
    {/if}
    <button 
        class="edit-button" 
        onclick={e => {
            e.stopPropagation();
            startEdit();
        }}
    >
        Edit
    </button>
  {/if}
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
    position: relative;
  }

  .family-node.spouse {
    border-color: #FF69B4;
    background: #fff0f5;
  }

  .family-node.selected {
    border-color: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
  }

  .family-node.editing {
    cursor: default;
    padding: 15px;
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

  .edit-form input[type="text"],
  .edit-form input[type="number"] {
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .living-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9em;
    color: #444;
  }

  .edit-buttons {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .edit-buttons button {
    flex: 1;
    padding: 4px;
    border: none;
    border-radius: 4px;
    font-size: 0.8em;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .edit-buttons .save {
    background: #28a745;
    color: white;
  }

  .edit-buttons .save:hover {
    background: #218838;
  }

  .edit-buttons .cancel {
    background: #dc3545;
    color: white;
  }

  .edit-buttons .cancel:hover {
    background: #c82333;
  }

  .edit-button {
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 2px 6px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.7em;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .family-node:hover .edit-button {
    opacity: 1;
  }

  :global(.family-node :where(.svelte-flow__handle)) {
    width: 8px;
    height: 8px;
    background: #555;
  }

  :global(.family-node :where(.svelte-flow__handle-right, .svelte-flow__handle-left)) {
    top: 50%;
  }

  .marriage-details {
    margin-top: 8px;
    font-size: 0.9em;
    color: #666;
  }

  .current-spouse {
    color: #28a745;
    font-weight: bold;
    margin-top: 4px;
  }

  .current-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9em;
    color: #444;
  }
</style>
<script lang="ts">
    import { onMount } from 'svelte';
    import { Sun, Moon } from 'lucide-svelte';

    let checked = $state(false);

    onMount(() => {
        const mode = localStorage.getItem('mode') || 'light';
        checked = mode === 'dark';
        document.documentElement.setAttribute('data-mode', mode);
    });

    function handleChange() {
        checked = !checked;
        const mode = checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-mode', mode);
        localStorage.setItem('mode', mode);
    }
</script>

<button 
    class="btn btn-sm variant-soft"
    onclick={handleChange}
    aria-label="Toggle theme"
>
    <div class="flex items-center gap-2">
        {#if checked}
            <Sun class="w-5 h-5" />
        {:else}
            <Moon class="w-5 h-5" />
        {/if}
    </div>
</button>

<!-- Script to set initial theme -->
<svelte:head>
    {@html `
        <script>
            const mode = localStorage.getItem('mode') || 'light';
            document.documentElement.setAttribute('data-mode', mode);
        <\/script>
    `}
</svelte:head> 
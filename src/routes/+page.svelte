<script lang="ts">
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { 
        Trees, 
        Sun, 
        Moon, 
        Menu, 
        X,
        ChevronRight,
        Lock,
        Users,
        FileCheck,
        Network,
        Key
    } from 'lucide-svelte';
    import LightSwitch from '$lib/components/LightSwitch.svelte';

    type IconItem = {
        icon: typeof Network | typeof Users | typeof FileCheck | typeof Key | typeof Lock;
        label: string;
    };

    let mounted = false;
    let darkMode = false;

    onMount(() => {
        mounted = true;
        // Check initial theme
        darkMode = document.documentElement.getAttribute('data-theme-mode') === 'dark';
    });

    // Handle mobile menu
    let isMenuOpen = false;
    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
    }

    function toggleTheme() {
        darkMode = !darkMode;
        document.documentElement.setAttribute('data-theme-mode', darkMode ? 'dark' : 'light');
    }
</script>

<div class="min-h-screen">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-surface-100-800-token border-b border-surface-300-600-token">
        <nav class="container mx-auto px-4 py-3">
            <div class="flex items-center justify-between">
                <!-- Logo -->
                <a href="/" class="flex items-center space-x-2">
                    <Trees class="w-6 h-6" />
                    <span class="text-xl font-semibold">LivingTree</span>
                </a>

                <!-- Desktop Navigation -->
                <div class="hidden md:flex items-center space-x-8">
                    <a href="/features" class="anchor">Features</a>
                    <a href="/pricing" class="anchor">Pricing</a>
                    <a href="/about" class="anchor">About</a>
                    <a href="/contact" class="anchor">Contact</a>
                    
                    <!-- Auth Buttons -->
                    <div class="flex items-center space-x-4">
                        <a href="/auth" class="btn variant-ghost-surface">Log In</a>
                        <a href="/auth?signup=true" class="btn variant-filled-primary">Sign Up</a>
                        
                        <!-- Theme Toggle -->
                        <LightSwitch />
                    </div>
                </div>

                <!-- Mobile Menu Button -->
                <button 
                    class="btn btn-sm variant-ghost md:hidden"
                    on:click={toggleMenu}
                    aria-label="Toggle menu"
                >
                    {#if isMenuOpen}
                        <X class="w-6 h-6" />
                    {:else}
                        <Menu class="w-6 h-6" />
                    {/if}
                </button>
            </div>

            <!-- Mobile Navigation -->
            {#if isMenuOpen}
                <div 
                    class="md:hidden pt-4 pb-3 space-y-3"
                    transition:fly="{{ y: -20, duration: 200 }}"
                >
                    <a href="/features" class="block py-2 anchor">Features</a>
                    <a href="/pricing" class="block py-2 anchor">Pricing</a>
                    <a href="/about" class="block py-2 anchor">About</a>
                    <a href="/contact" class="block py-2 anchor">Contact</a>
                    
                    <div class="pt-3 flex flex-col space-y-3">
                        <a href="/auth" class="btn variant-ghost-surface w-full">Log In</a>
                        <a href="/auth?signup=true" class="btn variant-filled-primary w-full">Sign Up</a>
                        
                        <!-- Mobile Theme Toggle -->
                        <div class="flex justify-center">
                            <LightSwitch />
                        </div>
                    </div>
                </div>
            {/if}
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <!-- Background Animation -->
        <div class="absolute inset-0 z-0">
            {#if mounted}
                <div class="absolute inset-0 opacity-10" in:fade>
                    <!-- Tree branches animation placeholder -->
                    <div class="absolute inset-0 bg-[url('/images/tree-pattern.svg')] bg-center bg-no-repeat bg-cover animate-pulse"></div>
                </div>
            {/if}
        </div>

        <!-- Hero Content -->
        <div class="container mx-auto px-4 z-10">
            <div class="text-center" in:fly="{{ y: 50, duration: 1000 }}">
                <h1 class="h1 mb-4">The LivingTree</h1>
                <p class="h3 text-surface-600-300-token italic mb-6">"Every branch tells a family's story."</p>
                <p class="text-xl md:text-2xl text-surface-600-300-token mb-12 max-w-2xl mx-auto">
                    Connect your family. Preserve your memories. Grow your lineage together.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <button class="btn variant-filled-primary btn-xl">
                        <Trees class="w-5 h-5 mr-2" />
                        <span>Start Your Tree</span>
                    </button>
                    <button class="btn variant-soft btn-xl">
                        <Network class="w-5 h-5 mr-2" />
                        <span>Explore a Demo Tree</span>
                    </button>
                    <button class="btn variant-ghost btn-xl">
                        <ChevronRight class="w-5 h-5 mr-2" />
                        <span>Learn More</span>
                    </button>
                </div>
            </div>
        </div>
    </section>

    <!-- What is The LivingTree? -->
    <section class="py-20">
        <div class="container mx-auto px-4">
            <h2 class="h2 text-center mb-16">What is The LivingTree?</h2>
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div class="prose prose-lg max-w-none">
                    <p class="text-xl">
                        The LivingTree is a collaborative family history platform. Each user is a node. Together, you form clusters—small groups like siblings, cousins, or parents. These clusters verify new additions and preserve memories across generations.
                    </p>
                </div>
                <div class="grid grid-cols-2 gap-8">
                    {#each [
                        { icon: Network, label: 'Nodes' },
                        { icon: Users, label: 'Clusters' },
                        { icon: FileCheck, label: 'Memories' },
                        { icon: Key, label: 'Consensus' },
                        { icon: Lock, label: 'Privacy' }
                    ] as { icon, label }}
                        <div class="card p-4 text-center variant-soft" in:fade="{{ delay: 200 }}">
                            <svelte:component this={icon} class="w-8 h-8 mx-auto mb-2" />
                            <p class="font-semibold">{label}</p>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </section>

    <!-- Privacy & Redaction -->
    <section class="py-20">
        <div class="container mx-auto px-4">
            <div class="card variant-ghost p-8 max-w-3xl mx-auto">
                <h2 class="text-4xl font-bold mb-8 text-center">Privacy & Redaction</h2>
                <div class="space-y-6">
                    <p class="text-lg">✓ Private by default. Shared only with your clusters.</p>
                    <p class="text-lg">✓ Redaction levels ensure sensitive data is hidden—even from close family if needed.</p>
                    <p class="text-lg">✓ Every memory, photo, or story respects your control.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Organic Growth -->
    <section class="py-20 bg-surface-100/50">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center mb-12">Organic Growth</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {#each [
                    'No central authority.',
                    'Trees grow from one user, inviting their family.',
                    'Eventually, disconnected trees might merge through verified connections.',
                    'Trees support multiple roots and intersections of lineage.'
                ] as point}
                    <div class="card p-6 variant-soft-surface" in:fade="{{ delay: 300 }}">
                        <p class="text-lg">{point}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Memory Chains -->
    <section class="py-20 bg-surface-50">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center mb-12">Memory Chains</h2>
            <div class="grid md:grid-cols-3 gap-8">
                {#each [
                    { title: 'Share', desc: 'Photos, voice notes, and videos' },
                    { title: 'Link', desc: 'Memories across generations' },
                    { title: 'Preserve', desc: 'Digital heritage through clusters' }
                ] as { title, desc }}
                    <div class="card p-6 text-center variant-filled-surface" in:fade="{{ delay: 400 }}">
                        <h3 class="text-2xl font-bold mb-4">{title}</h3>
                        <p class="text-lg">{desc}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Features Overview -->
    <section class="py-20 bg-surface-100/50">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center mb-12">Features Overview</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {#each [
                    { title: 'Dynamic Tree', desc: 'Built from nodes, relationships, and verified connections' },
                    { title: 'Clusters', desc: 'Small groups that govern identity and trust' },
                    { title: 'Consensus System', desc: 'Cluster voting decides on new relatives or disputed nodes' },
                    { title: 'Memory Chains', desc: 'Attach stories to people and pass them through generations' },
                    { title: 'Redaction Levels', desc: 'Full privacy control at the individual level' },
                    { title: 'Invite System', desc: 'Bring in family via shareable, verifiable invite links' },
                    { title: 'Tree Visualization', desc: "Interactive, zoomable, graph-based rendering of your family's network" },
                    { title: 'Multi-root Support', desc: 'Enables strangers to start their own trees and merge later' }
                ] as { title, desc }}
                    <div class="card p-6 variant-soft" in:fade="{{ delay: 500 }}">
                        <h3 class="text-xl font-bold mb-2">{title}</h3>
                        <p>{desc}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Testimonials -->
    <section class="py-20 bg-surface-50">
        <div class="container mx-auto px-4">
            <h2 class="text-4xl font-bold text-center mb-12">What People Say</h2>
            <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {#each [
                    { quote: 'It feels like a living monument to our family.', author: 'Beta User' },
                    { quote: "I finally have a place to store my grandfather's stories.", author: 'Early Contributor' }
                ] as { quote, author }}
                    <div class="card p-8 variant-ghost" in:fade="{{ delay: 600 }}">
                        <p class="text-xl italic mb-4">"{quote}"</p>
                        <p class="text-right font-semibold">— {author}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Final CTA -->
    <section class="py-20 bg-surface-100/50">
        <div class="container mx-auto px-4 text-center">
            <h2 class="text-4xl font-bold mb-8">Ready to Start Your Family Tree?</h2>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button class="btn variant-filled-primary btn-xl">Start Your Tree</button>
                <button class="btn variant-soft-surface btn-xl">Join With Invite Code</button>
                <button class="btn variant-ghost-surface btn-xl">Explore Demo</button>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 bg-surface-900 text-surface-50">
        <div class="container mx-auto px-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                    <h3 class="font-bold mb-4">About</h3>
                    <ul class="space-y-2">
                        <li><a href="/about" class="hover:text-primary-400">Our Story</a></li>
                        <li><a href="/team" class="hover:text-primary-400">Team</a></li>
                        <li><a href="/blog" class="hover:text-primary-400">Blog</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="font-bold mb-4">Docs</h3>
                    <ul class="space-y-2">
                        <li><a href="/docs" class="hover:text-primary-400">Getting Started</a></li>
                        <li><a href="/docs/api" class="hover:text-primary-400">API</a></li>
                        <li><a href="/docs/faq" class="hover:text-primary-400">FAQ</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="font-bold mb-4">Legal</h3>
                    <ul class="space-y-2">
                        <li><a href="/privacy" class="hover:text-primary-400">Privacy Policy</a></li>
                        <li><a href="/terms" class="hover:text-primary-400">Terms of Service</a></li>
                        <li><a href="/cookies" class="hover:text-primary-400">Cookie Policy</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="font-bold mb-4">Connect</h3>
                    <ul class="space-y-2">
                        <li><a href="https://github.com/livingtree" class="hover:text-primary-400">GitHub</a></li>
                        <li><a href="/contact" class="hover:text-primary-400">Contact</a></li>
                        <li><a href="/support" class="hover:text-primary-400">Support</a></li>
                    </ul>
                </div>
            </div>
            <div class="mt-12 pt-8 border-t border-surface-700 text-center">
                <p>© {new Date().getFullYear()} The LivingTree. All rights reserved.</p>
            </div>
        </div>
    </footer>
</div>

<style lang="postcss">
    :global(html) {
        scroll-behavior: smooth;
    }

    /* Header shadow on scroll */
    header {
        backdrop-filter: blur(8px);
    }
</style>

<script lang="ts">
	import BluePill from "$lib/BluePill/BluePill.svelte";
	import RedPill from "$lib/RedPill/RedPill.svelte";
	import { fade, fly } from "svelte/transition";

	let choice: "red" | "blue" | null = null;
</script>

<div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col items-center justify-center gap-12 p-8">

	<h1
		class="text-5xl md:text-6xl font-extrabold tracking-tight text-center"
		in:fly={{ y: -40, duration: 600 }}
	>
		Choose Your Reality
	</h1>

	<div class="flex gap-10">
		<button
			class="px-10 py-5 rounded-2xl bg-red-500 hover:bg-red-600 transition-all duration-300 shadow-2xl hover:scale-110 text-xl font-bold"
			on:click={() => (choice = "red")}
		>
			Red Pill
		</button>

		<button
			class="px-10 py-5 rounded-2xl bg-blue-500 hover:bg-blue-600 transition-all duration-300 shadow-2xl hover:scale-110 text-xl font-bold"
			on:click={() => (choice = "blue")}
		>
			Blue Pill
		</button>
	</div>

	{#if choice === "red"}
		<div in:fade>
			<RedPill />
		</div>
	{/if}

	{#if choice === "blue"}
		<div in:fade>
			<BluePill />
		</div>
	{/if}
</div>



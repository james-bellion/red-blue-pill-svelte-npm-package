#!/usr/bin/env node

import prompts from "prompts";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
	console.log("\n💊 Welcome to Red/Blue Generator\n");

	const response = await prompts(
		[
			{
				type: "text",
				name: "projectName",
				message: "Project name:",
				initial: "my-app"
			},
			{
				type: "text",
				name: "userName",
				message: "Your name:",
				initial: "Explorer"
			},
			{
				type: "select",
				name: "pill",
				message: "Choose your reality:",
				choices: [
					{ title: "Red Pill 🔴", value: "red" },
					{ title: "Blue Pill 🔵", value: "blue" }
				]
			}
		],
		{
			onCancel: () => {
				console.log("\nCancelled.\n");
				process.exit(0);
			}
		}
	);

	if (!response.projectName || !response.userName || !response.pill) return;

	const targetDir = path.join(process.cwd(), response.projectName);

	if (await fs.pathExists(targetDir)) {
		console.error(`\n❌ Directory "${response.projectName}" already exists.\n`);
		process.exit(1);
	}

	console.log(`\n📁 Creating project in ./${response.projectName}...`);

	// 1. Copy base template
	await fs.copy(path.join(__dirname, "../templates/base"), targetDir);

	// Rename _gitignore → .gitignore (npm strips dotfiles when publishing)
	const gitignoreSrc = path.join(targetDir, "_gitignore");
	if (await fs.pathExists(gitignoreSrc)) {
		await fs.rename(gitignoreSrc, path.join(targetDir, ".gitignore"));
	}

	// 2. Inject selected feature (overwrites +page.svelte, adds component)
	await fs.copy(
		path.join(__dirname, `../templates/features/${response.pill}`),
		targetDir,
		{ overwrite: true }
	);

	// 3. Write .env with the user's name
	await fs.writeFile(
		path.join(targetDir, ".env"),
		`PUBLIC_USER_NAME=${response.userName}\n`
	);

	// 4. Update package.json name to match project name
	const pkgPath = path.join(targetDir, "package.json");
	const pkg = await fs.readJson(pkgPath);
	pkg.name = response.projectName;
	await fs.writeJson(pkgPath, pkg, { spaces: "\t" });

	// 5. Install dependencies
	console.log("\n📦 Installing dependencies...");
	try {
		execSync("bun install", { cwd: targetDir, stdio: "inherit" });
	} catch {
		// Fall back to npm if bun is not available
		execSync("npm install", { cwd: targetDir, stdio: "inherit" });
	}

	console.log("\n✨ Done! Your project is ready.\n");
	console.log(`   cd ${response.projectName}`);
	console.log("   bun run dev\n");
}

main();

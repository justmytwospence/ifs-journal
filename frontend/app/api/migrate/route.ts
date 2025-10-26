import { NextResponse } from "next";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// One-time migration endpoint
// DELETE THIS FILE after running migrations in production
export async function POST(request: Request) {
	try {
		// Simple security: require a secret token
		const authHeader = request.headers.get("authorization");
		const expectedToken = process.env.MIGRATION_SECRET;

		if (!expectedToken) {
			return NextResponse.json(
				{ error: "Migration endpoint not configured" },
				{ status: 500 },
			);
		}

		if (authHeader !== `Bearer ${expectedToken}`) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Run Prisma migrations
		const { stdout, stderr } = await execAsync("npx prisma migrate deploy");

		return NextResponse.json({
			success: true,
			message: "Migrations completed",
			output: stdout,
			errors: stderr || null,
		});
	} catch (error) {
		console.error("Migration failed:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

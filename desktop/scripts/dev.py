import asyncio
import subprocess
import sys
from pathlib import Path
from watchfiles import awatch


async def run_dev():
    project_root = Path(__file__).parent.parent
    src_dir = project_root / "src"

    print(f"Watching {src_dir} for changes...")

    async for changes in awatch(src_dir):
        print(f"Changes detected: {changes}")
        print("Restarting app...")

        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "opentype_tutor.main",
            cwd=project_root,
        )
        await proc.wait()


if __name__ == "__main__":
    asyncio.run(run_dev())
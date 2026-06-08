import asyncio
import subprocess
import os
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger()

SAFE_COMMANDS = {
    "ls", "pwd", "echo", "cat", "head", "tail", "grep", "find",
    "wc", "sort", "uniq", "date", "whoami", "python3", "node",
    "npm", "git", "curl",
}

BLOCKED_PATTERNS = [
    "rm -rf",
    "sudo",
    "chmod 777",
    "> /dev/",
    "dd if=",
    "mkfs",
    "fdisk",
]


def is_safe_command(command: str) -> bool:
    cmd_lower = command.lower().strip()
    for pattern in BLOCKED_PATTERNS:
        if pattern in cmd_lower:
            return False
    return True


async def run_shell_command(
    command: str,
    cwd: Optional[str] = None,
    timeout: int = 30,
    safe_mode: bool = True,
) -> Dict[str, Any]:
    if safe_mode and not is_safe_command(command):
        return {
            "success": False,
            "error": "Command blocked by safety rules",
            "command": command,
        }

    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd or os.getcwd(),
        )

        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )

        return {
            "success": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
        }

    except asyncio.TimeoutError:
        proc.kill()
        return {"success": False, "error": f"Command timed out after {timeout}s"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def create_file(path: str, content: str) -> Dict[str, Any]:
    try:
        file_path = Path(path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        return {"success": True, "path": str(file_path.resolve()), "size": len(content)}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def read_file(path: str, max_lines: int = 500) -> Dict[str, Any]:
    try:
        file_path = Path(path)
        if not file_path.exists():
            return {"success": False, "error": "File not found"}

        content = file_path.read_text(encoding="utf-8", errors="replace")
        lines = content.split("\n")

        if len(lines) > max_lines:
            content = "\n".join(lines[:max_lines])
            content += f"\n... (truncated, {len(lines)} total lines)"

        return {
            "success": True,
            "path": str(file_path.resolve()),
            "content": content,
            "size": file_path.stat().st_size,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def list_directory(path: str = ".") -> Dict[str, Any]:
    try:
        dir_path = Path(path)
        items = []
        for item in sorted(dir_path.iterdir()):
            items.append({
                "name": item.name,
                "type": "directory" if item.is_dir() else "file",
                "size": item.stat().st_size if item.is_file() else None,
            })
        return {"success": True, "path": str(dir_path.resolve()), "items": items}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def move_file(src: str, dst: str) -> Dict[str, Any]:
    try:
        shutil.move(src, dst)
        return {"success": True, "from": src, "to": dst}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def open_application(app_name: str) -> Dict[str, Any]:
    import platform
    try:
        system = platform.system()
        if system == "Darwin":
            proc = await asyncio.create_subprocess_shell(f"open -a '{app_name}'")
        elif system == "Linux":
            proc = await asyncio.create_subprocess_shell(app_name)
        elif system == "Windows":
            proc = await asyncio.create_subprocess_shell(f'start "" "{app_name}"')
        else:
            return {"success": False, "error": f"Unsupported OS: {system}"}

        await proc.wait()
        return {"success": True, "app": app_name}
    except Exception as e:
        return {"success": False, "error": str(e)}

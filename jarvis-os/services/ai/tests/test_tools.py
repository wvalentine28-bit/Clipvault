import pytest
import asyncio


@pytest.mark.asyncio
async def test_safe_command_validation():
    from tools.computer import is_safe_command

    assert is_safe_command("ls -la") is True
    assert is_safe_command("echo hello") is True
    assert is_safe_command("rm -rf /") is False
    assert is_safe_command("sudo rm file") is False


@pytest.mark.asyncio
async def test_run_safe_command():
    from tools.computer import run_shell_command

    result = await run_shell_command("echo hello world", safe_mode=True)
    assert result["success"] is True
    assert "hello world" in result["stdout"]


@pytest.mark.asyncio
async def test_run_blocked_command():
    from tools.computer import run_shell_command

    result = await run_shell_command("rm -rf /tmp/test", safe_mode=True)
    assert result["success"] is False
    assert "blocked" in result.get("error", "").lower()


@pytest.mark.asyncio
async def test_create_and_read_file(tmp_path):
    from tools.computer import create_file, read_file

    test_path = str(tmp_path / "test.txt")
    content = "Hello, JARVIS!"

    create_result = await create_file(test_path, content)
    assert create_result["success"] is True

    read_result = await read_file(test_path)
    assert read_result["success"] is True
    assert read_result["content"] == content

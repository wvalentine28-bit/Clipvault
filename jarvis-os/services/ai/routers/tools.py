from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()


class ShellRequest(BaseModel):
    command: str
    cwd: Optional[str] = None
    timeout: int = 30
    safe_mode: bool = True


class FileRequest(BaseModel):
    path: str
    content: Optional[str] = None


class BrowserScrapeRequest(BaseModel):
    url: str
    extract_text: bool = True


class BrowserActionsRequest(BaseModel):
    url: str
    actions: List[Dict[str, Any]]


@router.post("/shell")
async def run_shell(request: ShellRequest):
    from tools.computer import run_shell_command
    result = await run_shell_command(
        command=request.command,
        cwd=request.cwd,
        timeout=request.timeout,
        safe_mode=request.safe_mode,
    )
    return {"success": True, "data": result}


@router.post("/file/read")
async def read_file_endpoint(request: FileRequest):
    from tools.computer import read_file
    result = await read_file(request.path)
    return {"success": True, "data": result}


@router.post("/file/write")
async def write_file_endpoint(request: FileRequest):
    if not request.content:
        raise HTTPException(400, "Content required")
    from tools.computer import create_file
    result = await create_file(request.path, request.content)
    return {"success": True, "data": result}


@router.post("/browser/scrape")
async def browser_scrape(request: BrowserScrapeRequest):
    from tools.browser import browser_automation
    if not browser_automation.browser:
        await browser_automation.initialize()
    result = await browser_automation.scrape_url(request.url, request.extract_text)
    return {"success": True, "data": result}


@router.post("/browser/actions")
async def browser_actions(request: BrowserActionsRequest):
    from tools.browser import browser_automation
    if not browser_automation.browser:
        await browser_automation.initialize()
    result = await browser_automation.execute_actions(request.url, request.actions)
    return {"success": True, "data": result}

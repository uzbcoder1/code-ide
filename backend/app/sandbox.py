"""
CodeStudio Sandbox — Xavfsiz kod bajarish moduli.

Bu modul foydalanuvchi kodini xavfsiz muhitda bajarish uchun:
- Xavfli Python modullarini bloklash
- Resurs cheklovlari (xotira, vaqt)
- Fayl tizimiga kirishni cheklash
"""

import subprocess
import tempfile
import os
import time
import re
import logging
import platform
from dataclasses import dataclass
import asyncio
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# Xavfli Python modullari — import qilish taqiqlangan
BLOCKED_PYTHON_MODULES = [
    "os", "subprocess", "shutil", "sys", "importlib",
    "ctypes", "socket", "http", "urllib", "requests",
    "ftplib", "smtplib", "telnetlib", "xmlrpc",
    "multiprocessing", "threading", "signal",
    "pathlib", "glob", "fnmatch",
    "pickle", "shelve", "marshal",
    "code", "codeop", "compile", "compileall",
    "webbrowser", "antigravity",
    "pty", "pipes", "resource",
    "gc", "inspect",
]

# Xavfli Python funksiyalari
BLOCKED_PYTHON_BUILTINS = [
    "exec", "eval", "compile", "__import__",
    "open", "breakpoint",
]

# Sandbox chetlab o'tishni bloklash uchun qo'shimcha patternlar
BLOCKED_PATTERNS = [
    # __builtins__ orqali
    r'__builtins__',
    r'__subclasses__',
    r'__bases__',
    r'__mro__',
    r'__class__',
    r'__globals__',
    r'__code__',
    r'__dict__\s*\[',           # obj.__dict__['...']
    # Xavfli built-in funksiyalar
    r'\bgetattr\s*\(',
    r'\bsetattr\s*\(',
    r'\bdelattr\s*\(',
    r'\bglobals\s*\(',
    r'\blocals\s*\(',
    r'\bvars\s*\(',
    r'\bdir\s*\(',
    r'\btype\s*\(\s*["\']',     # type('...', ...) — dinamik class yaratish
    # String yashirish texnikalari
    r'\bchr\s*\(',              # chr(111) + chr(115) = "os"
    r'\bord\s*\(',
    r'\bbytes\s*\(',
    r'\bbytearray\s*\(',
    # Xavfli modullar
    r'\b__loader__',
    r'\b__spec__',
]

EXECUTION_TIMEOUT = 10  # soniyalarda
MAX_OUTPUT_LENGTH = 50000  # 50KB chiqish limiti


@dataclass
class ExecutionResult:
    """Kod bajarish natijasi."""
    output: str = ""
    error: str = ""
    exit_code: int = 0
    duration_ms: int = 0


def validate_python_code(code: str) -> str | None:
    """
    Python kodini xavfli modullar va funksiyalar uchun tekshirish.
    Agar xavfli kod topilsa, xatolik xabarini qaytaradi.
    Aks holda None qaytaradi.
    """
    lines = code.split("\n")
    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # Bo'sh satr yoki kommentariyani o'tkazib yuborish
        if not stripped or stripped.startswith("#"):
            continue

        # import tekshiruvi
        for module in BLOCKED_PYTHON_MODULES:
            # import os, from os import ..., import os.path
            patterns = [
                rf'\bimport\s+{re.escape(module)}\b',
                rf'\bfrom\s+{re.escape(module)}\b',
            ]
            for pattern in patterns:
                if re.search(pattern, stripped):
                    return (
                        f"Xavfsizlik xatosi (qator {i}): '{module}' moduli taqiqlangan. "
                        f"Xavfsizlik sababli ba'zi tizim modullari bloklanadi."
                    )

        # Xavfli built-in funksiyalarni tekshirish
        for builtin in BLOCKED_PYTHON_BUILTINS:
            # exec(...), eval(...), open(...) kabilar
            pattern = rf'\b{re.escape(builtin)}\s*\('
            if re.search(pattern, stripped):
                return (
                    f"Xavfsizlik xatosi (qator {i}): '{builtin}()' funksiyasi taqiqlangan. "
                    f"Xavfsizlik sababli ba'zi tizim funksiyalari bloklanadi."
                )

        # Sandbox chetlab o'tish usullarini tekshirish
        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, stripped):
                return (
                    f"Xavfsizlik xatosi (qator {i}): Taqiqlangan ifoda aniqlandi. "
                    f"Xavfsizlik sababli ba'zi tizim funksiyalari bloklanadi."
                )

    return None


def _truncate_output(output: str) -> str:
    """Chiqishni maksimal uzunlikka qisqartirish."""
    if len(output) > MAX_OUTPUT_LENGTH:
        return output[:MAX_OUTPUT_LENGTH] + "\n\n... [Chiqish juda uzun — qisqartirildi]"
    return output


def _run_process(cmd: list[str], timeout: int = EXECUTION_TIMEOUT, cwd: str | None = None, input_data: str | None = None) -> tuple[str, str, int]:
    """
    Jarayonni xavfsiz muhitda bajarish.
    Qaytaradi: (stdout, stderr, exit_code)
    """
    # Xavfsiz muhit o'zgaruvchilari — faqat keraklilarini berish
    safe_env = {
        "PATH": os.environ.get("PATH", ""),
        "LANG": "en_US.UTF-8",
        "HOME": cwd or tempfile.gettempdir(),
    }

    # Windows uchun qo'shimcha muhit o'zgaruvchilari
    if platform.system() == "Windows":
        safe_env["SystemRoot"] = os.environ.get("SystemRoot", r"C:\Windows")
        safe_env["TEMP"] = os.environ.get("TEMP", tempfile.gettempdir())
        safe_env["TMP"] = os.environ.get("TMP", tempfile.gettempdir())
        # Java uchun
        java_home = os.environ.get("JAVA_HOME")
        if java_home:
            safe_env["JAVA_HOME"] = java_home

    try:
        result = subprocess.run(
            cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
            env=safe_env,
        )
        return (
            _truncate_output(result.stdout),
            _truncate_output(result.stderr),
            result.returncode,
        )
    except subprocess.TimeoutExpired:
        return "", f"Bajarish vaqti tugadi ({timeout} soniya limit)", -1
    except FileNotFoundError as e:
        return "", f"Dastur topilmadi: {e.filename}. Til kompilyatori/interpretatori o'rnatilganligini tekshiring.", -1
    except Exception:
        logger.exception("Kod bajarishda kutilmagan xatolik")
        return "", "Kod bajarishda ichki xatolik yuz berdi.", -1


def execute_python(code: str, temp_dir: str, stdin: str = "") -> ExecutionResult:
    """Python kodini xavfsiz bajarish."""
    start_time = time.time()

    # Xavfli kod tekshiruvi
    validation_error = validate_python_code(code)
    if validation_error:
        duration_ms = int((time.time() - start_time) * 1000)
        return ExecutionResult(error=validation_error, exit_code=1, duration_ms=duration_ms)

    file_path = os.path.join(temp_dir, "main.py")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)

    output, error, exit_code = _run_process(["python", file_path], cwd=temp_dir, input_data=stdin)

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_javascript(code: str, temp_dir: str, stdin: str = "", is_typescript: bool = False) -> ExecutionResult:
    """JavaScript/TypeScript kodini bajarish."""
    start_time = time.time()

    ext = "ts" if is_typescript else "js"
    file_path = os.path.join(temp_dir, f"main.{ext}")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)

    if is_typescript:
        cmd = ["npx", "ts-node", file_path]
    else:
        cmd = ["node", file_path]

    output, error, exit_code = _run_process(cmd, cwd=temp_dir, input_data=stdin)

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_cpp(code: str, temp_dir: str, stdin: str = "") -> ExecutionResult:
    """C/C++ kodini kompilatsiya va bajarish."""
    start_time = time.time()

    file_path = os.path.join(temp_dir, "main.cpp")
    exe_path = os.path.join(temp_dir, "main.out")

    # Windows uchun .exe
    if platform.system() == "Windows":
        exe_path = os.path.join(temp_dir, "main.exe")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)

    # Kompilatsiya
    compile_output, compile_error, compile_code = _run_process(
        ["g++", file_path, "-o", exe_path], cwd=temp_dir
    )
    if compile_code != 0:
        duration_ms = int((time.time() - start_time) * 1000)
        return ExecutionResult(error=compile_error, exit_code=compile_code, duration_ms=duration_ms)

    # Bajarish
    output, error, exit_code = _run_process([exe_path], cwd=temp_dir, input_data=stdin)

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_java(code: str, temp_dir: str, stdin: str = "") -> ExecutionResult:
    """Java kodini kompilatsiya va bajarish."""
    start_time = time.time()

    # Public class nomini aniqlash
    match = re.search(r'public\s+class\s+(\w+)', code)
    class_name = match.group(1) if match else "Main"
    file_path = os.path.join(temp_dir, f"{class_name}.java")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)

    # Kompilatsiya
    compile_output, compile_error, compile_code = _run_process(
        ["javac", file_path], cwd=temp_dir
    )
    if compile_code != 0:
        duration_ms = int((time.time() - start_time) * 1000)
        return ExecutionResult(error=compile_error, exit_code=compile_code, duration_ms=duration_ms)

    # Bajarish
    output, error, exit_code = _run_process(
        ["java", "-cp", temp_dir, class_name], cwd=temp_dir, input_data=stdin
    )

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_code(language: str, code: str, stdin: str = "") -> ExecutionResult:
    """
    Kodni xavfsiz muhitda bajarish — asosiy entry point.

    Args:
        language: Dasturlash tili (python, javascript, typescript, cpp, java, ...)
        code: Bajariladigan kod matni

    Returns:
        ExecutionResult — natija, xatolik, exit_code, vaqt
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        if language == "python":
            return execute_python(code, temp_dir, stdin)
        elif language in ("javascript", "js"):
            return execute_javascript(code, temp_dir, stdin, is_typescript=False)
        elif language == "typescript":
            return execute_javascript(code, temp_dir, stdin, is_typescript=True)
        elif language in ("cpp", "c", "c++", "cc"):
            return execute_cpp(code, temp_dir, stdin)
        elif language == "java":
            return execute_java(code, temp_dir, stdin)
        else:
            return ExecutionResult(
                error=f"'{language}' tili hali qo'llab-quvvatlanmaydi.",
                exit_code=1,
                duration_ms=0,
            )

async def _stream_output(stream: asyncio.StreamReader, websocket: WebSocket):
    try:
        while True:
            # chunk by chunk to support interactive typing
            data = await stream.read(1024)
            if not data:
                break
            # send to websocket
            text = data.decode("utf-8", errors="replace")
            # xterm.js needs \r\n for newlines, but let's just send raw text, xterm frontend can format if needed.
            await websocket.send_text(text)
    except Exception as e:
        logger.error(f"Stream output error: {e}")

async def _receive_input(stream: asyncio.StreamWriter, websocket: WebSocket, process: asyncio.subprocess.Process):
    try:
        while True:
            data = await websocket.receive_text()
            # Send input to process
            stream.write(data.encode("utf-8"))
            await stream.drain()
    except WebSocketDisconnect:
        # Client disconnected
        try:
            process.terminate()
        except:
            pass
    except Exception as e:
        logger.error(f"Receive input error: {e}")

async def execute_interactive(websocket: WebSocket, language: str, code: str) -> tuple[int, str]:
    """
    WebSocket orqali real vaqtda kod bajarish (Interactive).
    Qaytaradi: (exit_code, error_message)
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        # 1. Validation va muhit sozlash
        cmd = []
        if language == "python":
            validation_error = validate_python_code(code)
            if validation_error:
                await websocket.send_text(f"\\r\\n[Security Error]: {validation_error}\\r\\n")
                return 1, validation_error
            
            file_path = os.path.join(temp_dir, "main.py")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            cmd = ["python", "-u", file_path] # -u force unbuffered output!
            
        elif language in ("javascript", "js"):
            file_path = os.path.join(temp_dir, "main.js")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            cmd = ["node", file_path]
            
        elif language == "typescript":
            file_path = os.path.join(temp_dir, "main.ts")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            cmd = ["npx", "ts-node", file_path]
            
        elif language in ("cpp", "c", "c++", "cc"):
            file_path = os.path.join(temp_dir, "main.cpp")
            exe_path = os.path.join(temp_dir, "main.exe" if platform.system() == "Windows" else "main.out")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            
            # Kompilatsiya
            compile_proc = await asyncio.create_subprocess_exec(
                "g++", file_path, "-o", exe_path,
                cwd=temp_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await compile_proc.communicate()
            if compile_proc.returncode != 0:
                await websocket.send_text(f"\\r\\n[Compilation Error]\\r\\n{stderr.decode('utf-8', errors='replace')}")
                return compile_proc.returncode, "Compilation error"
            
            cmd = [exe_path]
            
        elif language == "java":
            match = re.search(r'public\s+class\s+(\w+)', code)
            class_name = match.group(1) if match else "Main"
            file_path = os.path.join(temp_dir, f"{class_name}.java")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            
            compile_proc = await asyncio.create_subprocess_exec(
                "javac", file_path,
                cwd=temp_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await compile_proc.communicate()
            if compile_proc.returncode != 0:
                await websocket.send_text(f"\\r\\n[Compilation Error]\\r\\n{stderr.decode('utf-8', errors='replace')}")
                return compile_proc.returncode, "Compilation error"
                
            cmd = ["java", "-cp", temp_dir, class_name]
            
        else:
            await websocket.send_text(f"\\r\\n[System Error]: '{language}' tili qo'llab quvvatlanmaydi.\\r\\n")
            return 1, "Unsupported language"

        safe_env = {
            "PATH": os.environ.get("PATH", ""),
            "LANG": "en_US.UTF-8",
            "HOME": temp_dir,
            "PYTHONUNBUFFERED": "1" # Force Python to not buffer stdout
        }
        if platform.system() == "Windows":
            safe_env["SystemRoot"] = os.environ.get("SystemRoot", r"C:\Windows")
            safe_env["TEMP"] = os.environ.get("TEMP", tempfile.gettempdir())
            safe_env["TMP"] = os.environ.get("TMP", tempfile.gettempdir())
            if os.environ.get("JAVA_HOME"):
                safe_env["JAVA_HOME"] = os.environ.get("JAVA_HOME")

        # Asinxron jarayonni boshlash
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=temp_dir,
                env=safe_env
            )
            
            # Fon vazifalari
            tasks = [
                asyncio.create_task(_stream_output(process.stdout, websocket)),
                asyncio.create_task(_stream_output(process.stderr, websocket)),
                asyncio.create_task(_receive_input(process.stdin, websocket, process))
            ]
            
            # process tugashini yoki vaqt tugashini kutish
            try:
                await asyncio.wait_for(process.wait(), timeout=EXECUTION_TIMEOUT)
            except asyncio.TimeoutError:
                try:
                    process.terminate()
                except:
                    pass
                await websocket.send_text(f"\\r\\n[System Error]: Bajarish vaqti tugadi ({EXECUTION_TIMEOUT} soniya)\\r\\n")
                
            # Tozalash
            for t in tasks:
                t.cancel()
                
            exit_code = process.returncode if process.returncode is not None else -1
            await websocket.send_text(f"\\r\\nProcess finished with exit code {exit_code}\\r\\n")
            await websocket.close()
            return exit_code, ""
            
        except Exception as e:
            logger.exception("Interactive execution error")
            await websocket.send_text(f"\\r\\n[System Error]: {str(e)}\\r\\n")
            return -1, str(e)

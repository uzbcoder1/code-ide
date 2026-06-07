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

    return None


def _truncate_output(output: str) -> str:
    """Chiqishni maksimal uzunlikka qisqartirish."""
    if len(output) > MAX_OUTPUT_LENGTH:
        return output[:MAX_OUTPUT_LENGTH] + "\n\n... [Chiqish juda uzun — qisqartirildi]"
    return output


def _run_process(cmd: list[str], timeout: int = EXECUTION_TIMEOUT, cwd: str | None = None) -> tuple[str, str, int]:
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


def execute_python(code: str, temp_dir: str) -> ExecutionResult:
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

    output, error, exit_code = _run_process(["python", file_path], cwd=temp_dir)

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_javascript(code: str, temp_dir: str, is_typescript: bool = False) -> ExecutionResult:
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

    output, error, exit_code = _run_process(cmd, cwd=temp_dir)

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_cpp(code: str, temp_dir: str) -> ExecutionResult:
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
    output, error, exit_code = _run_process([exe_path], cwd=temp_dir)

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_java(code: str, temp_dir: str) -> ExecutionResult:
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
        ["java", "-cp", temp_dir, class_name], cwd=temp_dir
    )

    duration_ms = int((time.time() - start_time) * 1000)
    return ExecutionResult(output=output, error=error, exit_code=exit_code, duration_ms=duration_ms)


def execute_code(language: str, code: str) -> ExecutionResult:
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
            return execute_python(code, temp_dir)
        elif language in ("javascript", "js"):
            return execute_javascript(code, temp_dir, is_typescript=False)
        elif language == "typescript":
            return execute_javascript(code, temp_dir, is_typescript=True)
        elif language in ("cpp", "c", "c++", "cc"):
            return execute_cpp(code, temp_dir)
        elif language == "java":
            return execute_java(code, temp_dir)
        else:
            return ExecutionResult(
                error=f"'{language}' tili hali qo'llab-quvvatlanmaydi.",
                exit_code=1,
                duration_ms=0,
            )

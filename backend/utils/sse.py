from typing import AsyncGenerator, Callable, Dict, Any
import json


def format_sse(data: Dict[str, Any]) -> bytes:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n".encode("utf-8")


async def stream_chunks(
    chunk_iter: AsyncGenerator[str, None],
    on_done: Callable[[], Dict[str, Any]],
) -> AsyncGenerator[bytes, None]:
    async for chunk in chunk_iter:
        yield format_sse({"type": "chunk", "content": chunk})
    yield format_sse(on_done())



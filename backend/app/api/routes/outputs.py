from __future__ import annotations

import asyncio
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import OutputNode, Prompt, Tag, User
from app.models.enums import GenerationMode, ModerationOutcome, NodeType, PromptType
from app.schemas.output import (
    OutputBulkUploadResponse,
    OutputListResponse,
    OutputResponse,
    OutputSummary,
    OutputUpdate,
    TagResponse,
)
from app.schemas.prompt import PromptResponse
from app.services.thumbnail import generate_thumbnails

router = APIRouter()

ACCEPTED_MIME_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}
MAX_FILE_SIZE = 100 * 1024 * 1024


@router.post("/upload", response_model=OutputResponse, status_code=status.HTTP_201_CREATED)
async def upload_output(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    prompt_text: str | None = Form(default=None),
    prompt_type: PromptType = Form(default=PromptType.BASE),
    parent_id: uuid.UUID | None = Form(default=None),
    generation_mode: GenerationMode = Form(default=GenerationMode.SPEED),
    moderation_outcome: ModerationOutcome = Form(default=ModerationOutcome.NOT_APPLICABLE),
    rating: int | None = Form(default=None),
    notes: str | None = Form(default=None),
) -> OutputResponse:
    del current_user
    return await _create_output_from_upload(
        db=db,
        file=file,
        title=title,
        prompt_text=prompt_text,
        prompt_type=prompt_type,
        parent_id=parent_id,
        generation_mode=generation_mode,
        moderation_outcome=moderation_outcome,
        rating=rating,
        notes=notes,
    )


@router.post("/upload/bulk", response_model=OutputBulkUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_outputs_bulk(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    files: list[UploadFile] = File(...),
    title: str | None = Form(default=None),
    prompt_text: str | None = Form(default=None),
    prompt_type: PromptType = Form(default=PromptType.BASE),
    parent_id: uuid.UUID | None = Form(default=None),
    generation_mode: GenerationMode = Form(default=GenerationMode.SPEED),
    moderation_outcome: ModerationOutcome = Form(default=ModerationOutcome.NOT_APPLICABLE),
    rating: int | None = Form(default=None),
    notes: str | None = Form(default=None),
) -> OutputBulkUploadResponse:
    del current_user
    items = []
    for upload in files:
        items.append(
            await _create_output_from_upload(
                db=db,
                file=upload,
                title=title,
                prompt_text=prompt_text,
                prompt_type=prompt_type,
                parent_id=parent_id,
                generation_mode=generation_mode,
                moderation_outcome=moderation_outcome,
                rating=rating,
                notes=notes,
            )
        )
    return OutputBulkUploadResponse(items=items)


@router.get("", response_model=OutputListResponse)
async def list_outputs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 40,
    sort_by: Annotated[str, Query(pattern="^(created_at|rating|file_size|updated_at)$")] = "created_at",
    sort_order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
    node_type: NodeType | None = None,
    min_rating: Annotated[int | None, Query(ge=1, le=10)] = None,
    is_favorite: bool | None = None,
    search: str | None = None,
) -> OutputListResponse:
    del current_user
    conditions = []
    needs_prompt_join = False

    if node_type is not None:
        conditions.append(OutputNode.node_type == node_type)
    if min_rating is not None:
        conditions.append(OutputNode.rating >= min_rating)
    if is_favorite is not None:
        conditions.append(OutputNode.is_favorite == is_favorite)
    if search:
        needs_prompt_join = True
        search_pattern = f"%{search.strip()}%"
        conditions.append(or_(OutputNode.title.ilike(search_pattern), OutputNode.notes.ilike(search_pattern), Prompt.prompt_text.ilike(search_pattern)))

    count_stmt = select(func.count(func.distinct(OutputNode.id))).select_from(OutputNode)
    query: Select[tuple[OutputNode]] = select(OutputNode).options(
        selectinload(OutputNode.prompts),
        selectinload(OutputNode.tags),
    )
    if needs_prompt_join:
        count_stmt = count_stmt.outerjoin(Prompt)
        query = query.outerjoin(Prompt)
    if conditions:
        where_clause = and_(*conditions)
        count_stmt = count_stmt.where(where_clause)
        query = query.where(where_clause)

    total = int(await db.scalar(count_stmt) or 0)
    sort_column = getattr(OutputNode, sort_by)
    query = query.order_by(sort_column.asc() if sort_order == "asc" else sort_column.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    outputs = result.scalars().unique().all()
    return OutputListResponse(
        items=[serialize_output(output) for output in outputs],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total else 0,
    )


@router.get("/{output_id}", response_model=OutputResponse)
async def get_output(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    output_id: uuid.UUID,
) -> OutputResponse:
    del current_user
    output = await _get_output_or_404(db, output_id)
    return serialize_output(output)


@router.put("/{output_id}", response_model=OutputResponse)
async def update_output(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    output_id: uuid.UUID,
    payload: OutputUpdate,
) -> OutputResponse:
    del current_user
    output = await _get_output_or_404(db, output_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(output, field, value)
    output.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(output)
    output = await _get_output_or_404(db, output_id)
    return serialize_output(output)


@router.delete("/{output_id}")
async def delete_output(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    output_id: uuid.UUID,
) -> dict[str, str]:
    del current_user
    output = await _get_output_or_404(db, output_id)
    paths = [output.file_path, output.thumbnail_path, output.animated_thumbnail_path]
    await db.delete(output)
    await db.commit()
    for web_path in paths:
        _delete_web_path(web_path)
    return {"message": "deleted"}


async def _create_output_from_upload(
    *,
    db: AsyncSession,
    file: UploadFile,
    title: str | None,
    prompt_text: str | None,
    prompt_type: PromptType,
    parent_id: uuid.UUID | None,
    generation_mode: GenerationMode,
    moderation_outcome: ModerationOutcome,
    rating: int | None,
    notes: str | None,
) -> OutputResponse:
    if rating is not None and not 1 <= rating <= 10:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rating must be 1-10")

    mime_type = file.content_type or ""
    extension = ACCEPTED_MIME_TYPES.get(mime_type)
    if extension is None:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported file type")

    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 100MB limit")

    parent = None
    tree_id = uuid.uuid4()
    if parent_id is not None:
        parent = await db.get(OutputNode, parent_id)
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent output not found")
        tree_id = parent.tree_id

    file_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    relative_dir = Path(str(now.year)) / f"{now.month:02d}" / f"{now.day:02d}"
    media_dir = Path(settings.MEDIA_DIR) / relative_dir
    media_dir.mkdir(parents=True, exist_ok=True)
    absolute_file_path = media_dir / f"{file_id}{extension}"
    absolute_file_path.write_bytes(content)

    try:
        thumbnail = await asyncio.to_thread(
            generate_thumbnails,
            absolute_file_path,
            Path(settings.THUMBNAIL_DIR),
            str(file_id),
            mime_type,
        )
        output = OutputNode(
            id=file_id,
            parent_id=parent.id if parent else None,
            tree_id=tree_id,
            node_type=_infer_node_type(mime_type, parent_id, prompt_type),
            file_path=f"/media/{relative_dir.as_posix()}/{file_id}{extension}",
            thumbnail_path=thumbnail.thumbnail_path,
            animated_thumbnail_path=thumbnail.animated_thumbnail_path,
            mime_type=mime_type,
            file_size=len(content),
            width=thumbnail.metadata.width,
            height=thumbnail.metadata.height,
            duration=thumbnail.metadata.duration,
            title=title.strip() if title and title.strip() else None,
            rating=rating,
            is_favorite=False,
            notes=notes,
            moderation_outcome=moderation_outcome,
            generation_mode=generation_mode,
        )
        db.add(output)
        if prompt_text and prompt_text.strip():
            db.add(
                Prompt(
                    output_node=output,
                    prompt_text=prompt_text.strip(),
                    prompt_type=prompt_type,
                    extension_order=await _next_extension_order(db, parent_id) if prompt_type == PromptType.EXTENSION else None,
                )
            )
        await db.commit()
    except Exception:
        await db.rollback()
        absolute_file_path.unlink(missing_ok=True)
        raise

    return serialize_output(await _get_output_or_404(db, file_id))


async def _next_extension_order(db: AsyncSession, parent_id: uuid.UUID | None) -> int:
    if parent_id is None:
        return 1
    stmt = (
        select(func.max(Prompt.extension_order))
        .join(OutputNode, Prompt.output_node_id == OutputNode.id)
        .where(OutputNode.parent_id == parent_id, Prompt.prompt_type == PromptType.EXTENSION)
    )
    current = await db.scalar(stmt)
    return int(current or 0) + 1


def _infer_node_type(mime_type: str, parent_id: uuid.UUID | None, prompt_type: PromptType) -> NodeType:
    if mime_type in {"image/gif", "video/mp4", "video/webm"} or prompt_type == PromptType.EXTENSION:
        return NodeType.ANIMATION
    if parent_id is not None or prompt_type == PromptType.EDIT:
        return NodeType.EDIT
    return NodeType.BASE_IMAGE


async def _get_output_or_404(db: AsyncSession, output_id: uuid.UUID) -> OutputNode:
    result = await db.execute(
        select(OutputNode)
        .where(OutputNode.id == output_id)
        .options(
            selectinload(OutputNode.prompts),
            selectinload(OutputNode.tags),
            selectinload(OutputNode.parent),
            selectinload(OutputNode.children),
        )
    )
    output = result.scalar_one_or_none()
    if output is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Output not found")
    return output


def serialize_output(output: OutputNode) -> OutputResponse:
    prompts = sorted(output.prompts, key=lambda prompt: (prompt.extension_order or 0, prompt.created_at))
    children = sorted(output.children, key=lambda child: child.created_at, reverse=True) if "children" in output.__dict__ else []
    parent = output.parent if "parent" in output.__dict__ else None
    tags = output.tags if "tags" in output.__dict__ else []
    return OutputResponse(
        id=output.id,
        parent_id=output.parent_id,
        tree_id=output.tree_id,
        node_type=output.node_type,
        title=output.title,
        file_path=output.file_path,
        thumbnail_path=output.thumbnail_path,
        animated_thumbnail_path=output.animated_thumbnail_path,
        mime_type=output.mime_type,
        file_size=output.file_size,
        width=output.width,
        height=output.height,
        duration=output.duration,
        created_at=output.created_at,
        updated_at=output.updated_at,
        rating=output.rating,
        is_favorite=output.is_favorite,
        notes=output.notes,
        moderation_outcome=output.moderation_outcome,
        generation_mode=output.generation_mode,
        prompts=[PromptResponse.model_validate(prompt) for prompt in prompts],
        parent=_summary(parent) if parent else None,
        children=[_summary(child) for child in children],
        children_count=len(children),
        tags=[
            TagResponse(id=tag.id, name=tag.name, category=tag.category, color=tag.color)
            for tag in sorted(tags, key=lambda tag: tag.name)
            if isinstance(tag, Tag)
        ],
    )


def _summary(output: OutputNode) -> OutputSummary:
    return OutputSummary(
        id=output.id,
        node_type=output.node_type,
        title=output.title,
        file_path=output.file_path,
        thumbnail_path=output.thumbnail_path,
        animated_thumbnail_path=output.animated_thumbnail_path,
        width=output.width,
        height=output.height,
        rating=output.rating,
        is_favorite=output.is_favorite,
    )


def _delete_web_path(web_path: str | None) -> None:
    if not web_path:
        return
    if web_path.startswith("/media/"):
        path = Path(settings.MEDIA_DIR) / web_path.removeprefix("/media/")
    elif web_path.startswith("/thumbnails/"):
        path = Path(settings.THUMBNAIL_DIR) / web_path.removeprefix("/thumbnails/")
    else:
        return
    path.unlink(missing_ok=True)

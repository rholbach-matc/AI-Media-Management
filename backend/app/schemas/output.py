from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import GenerationMode, ModerationOutcome, NodeType, PromptType, TagCategory
from app.schemas.prompt import PromptResponse


class OutputCreate(BaseModel):
    title: str | None = None
    prompt_text: str | None = None
    prompt_type: PromptType = PromptType.BASE
    parent_id: UUID | None = None
    generation_mode: GenerationMode = GenerationMode.SPEED
    moderation_outcome: ModerationOutcome = ModerationOutcome.NOT_APPLICABLE
    rating: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


class OutputUpdate(BaseModel):
    title: str | None = None
    rating: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None
    is_favorite: bool | None = None
    moderation_outcome: ModerationOutcome | None = None


class OutputSummary(BaseModel):
    id: UUID
    node_type: NodeType
    title: str | None
    file_path: str
    thumbnail_path: str | None
    animated_thumbnail_path: str | None
    width: int
    height: int
    rating: int | None
    is_favorite: bool


class TagResponse(BaseModel):
    id: UUID
    name: str
    category: TagCategory
    color: str | None


class OutputResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID | None
    tree_id: UUID
    node_type: NodeType
    title: str | None
    file_path: str
    thumbnail_path: str | None
    animated_thumbnail_path: str | None
    mime_type: str
    file_size: int
    width: int
    height: int
    duration: float | None
    created_at: datetime
    updated_at: datetime
    rating: int | None
    is_favorite: bool
    notes: str | None
    moderation_outcome: ModerationOutcome
    generation_mode: GenerationMode
    prompts: list[PromptResponse] = []
    parent: OutputSummary | None = None
    children: list[OutputSummary] = []
    children_count: int = 0
    tags: list[TagResponse] = []


class OutputListResponse(BaseModel):
    items: list[OutputResponse]
    total: int
    page: int
    per_page: int
    pages: int


class OutputBulkUploadResponse(BaseModel):
    items: list[OutputResponse]

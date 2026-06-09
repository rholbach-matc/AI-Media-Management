from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import PromptType


class PromptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    output_node_id: UUID
    prompt_text: str
    prompt_type: PromptType
    extension_order: int | None
    parent_prompt_id: UUID | None
    technique_tags: list[str]
    includes_spicy_header: bool
    dodge_phrases_used: list[str] | None
    created_at: datetime

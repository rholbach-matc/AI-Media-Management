from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import PromptType, enum_values


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    output_node_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("output_nodes.id", ondelete="CASCADE"), nullable=False)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_type: Mapped[PromptType] = mapped_column(Enum(PromptType, name="prompt_type", values_callable=enum_values), nullable=False)
    extension_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_prompt_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("prompts.id", ondelete="SET NULL"), nullable=True)
    technique_tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, server_default=text("'{}'"))
    includes_spicy_header: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    dodge_phrases_used: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    output_node: Mapped["OutputNode"] = relationship("OutputNode", back_populates="prompts")
    parent_prompt: Mapped["Prompt | None"] = relationship("Prompt", remote_side=[id], back_populates="child_prompts")
    child_prompts: Mapped[list["Prompt"]] = relationship("Prompt", back_populates="parent_prompt")

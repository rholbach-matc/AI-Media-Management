from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import GenerationMode, ModerationOutcome, NodeType, enum_values


class OutputNode(Base):
    __tablename__ = "output_nodes"
    __table_args__ = (
        CheckConstraint("rating IS NULL OR (rating >= 1 AND rating <= 10)", name="ck_output_nodes_rating_range"),
    )

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    parent_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("output_nodes.id", ondelete="SET NULL"), nullable=True)
    tree_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    node_type: Mapped[NodeType] = mapped_column(Enum(NodeType, name="node_type", values_callable=enum_values), nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    thumbnail_path: Mapped[str | None] = mapped_column(String, nullable=True)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    moderation_outcome: Mapped[ModerationOutcome] = mapped_column(Enum(ModerationOutcome, name="moderation_outcome", values_callable=enum_values), nullable=False)
    generation_mode: Mapped[GenerationMode] = mapped_column(Enum(GenerationMode, name="generation_mode", values_callable=enum_values), nullable=False)

    parent: Mapped[OutputNode | None] = relationship("OutputNode", remote_side=[id], back_populates="children")
    children: Mapped[list[OutputNode]] = relationship("OutputNode", back_populates="parent")
    prompts: Mapped[list["Prompt"]] = relationship("Prompt", back_populates="output_node", cascade="all, delete-orphan")
    output_tags: Mapped[list["OutputTag"]] = relationship("OutputTag", back_populates="output_node", cascade="all, delete-orphan")
    project_nodes: Mapped[list["ProjectNode"]] = relationship("ProjectNode", back_populates="output_node", cascade="all, delete-orphan")
    session_nodes: Mapped[list["SessionNode"]] = relationship("SessionNode", back_populates="output_node", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship("Tag", secondary="output_tags", back_populates="output_nodes", viewonly=True)
    projects: Mapped[list["Project"]] = relationship("Project", secondary="project_nodes", back_populates="output_nodes", viewonly=True)
    sessions: Mapped[list["Session"]] = relationship("Session", secondary="session_nodes", back_populates="output_nodes", viewonly=True)

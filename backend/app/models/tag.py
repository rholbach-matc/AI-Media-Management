from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import TagCategory, enum_values


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    category: Mapped[TagCategory] = mapped_column(Enum(TagCategory, name="tag_category", values_callable=enum_values), nullable=False)
    color: Mapped[str | None] = mapped_column(String, nullable=True)

    output_tags: Mapped[list["OutputTag"]] = relationship("OutputTag", back_populates="tag", cascade="all, delete-orphan")
    output_nodes: Mapped[list["OutputNode"]] = relationship("OutputNode", secondary="output_tags", back_populates="tags", viewonly=True)


class OutputTag(Base):
    __tablename__ = "output_tags"
    __table_args__ = (UniqueConstraint("output_node_id", "tag_id", name="uq_output_tags_output_node_id_tag_id"),)

    output_node_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("output_nodes.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    output_node: Mapped["OutputNode"] = relationship("OutputNode", back_populates="output_tags")
    tag: Mapped[Tag] = relationship("Tag", back_populates="output_tags")

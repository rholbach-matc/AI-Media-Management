from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), ForeignKey("output_nodes.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    cover_image: Mapped["OutputNode | None"] = relationship("OutputNode", foreign_keys=[cover_image_id])
    project_nodes: Mapped[list["ProjectNode"]] = relationship("ProjectNode", back_populates="project", cascade="all, delete-orphan")
    output_nodes: Mapped[list["OutputNode"]] = relationship("OutputNode", secondary="project_nodes", back_populates="projects", viewonly=True)


class ProjectNode(Base):
    __tablename__ = "project_nodes"
    __table_args__ = (UniqueConstraint("project_id", "output_node_id", name="uq_project_nodes_project_id_output_node_id"),)

    project_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    output_node_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("output_nodes.id", ondelete="CASCADE"), primary_key=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    project: Mapped[Project] = relationship("Project", back_populates="project_nodes")
    output_node: Mapped["OutputNode"] = relationship("OutputNode", back_populates="project_nodes")

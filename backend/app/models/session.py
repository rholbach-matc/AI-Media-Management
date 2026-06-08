from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    started_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    ended_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    journal: Mapped[str | None] = mapped_column(Text, nullable=True)

    session_nodes: Mapped[list["SessionNode"]] = relationship("SessionNode", back_populates="session", cascade="all, delete-orphan")
    output_nodes: Mapped[list["OutputNode"]] = relationship("OutputNode", secondary="session_nodes", back_populates="sessions", viewonly=True)


class SessionNode(Base):
    __tablename__ = "session_nodes"
    __table_args__ = (UniqueConstraint("session_id", "output_node_id", name="uq_session_nodes_session_id_output_node_id"),)

    session_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True)
    output_node_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("output_nodes.id", ondelete="CASCADE"), primary_key=True)

    session: Mapped[Session] = relationship("Session", back_populates="session_nodes")
    output_node: Mapped["OutputNode"] = relationship("OutputNode", back_populates="session_nodes")

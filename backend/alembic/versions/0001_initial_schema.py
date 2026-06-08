"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-07 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


node_type = postgresql.ENUM("base_image", "edit", "animation", name="node_type", create_type=False)
moderation_outcome = postgresql.ENUM("passed", "blocked", "not_applicable", name="moderation_outcome", create_type=False)
generation_mode = postgresql.ENUM("speed", "quality", name="generation_mode", create_type=False)
prompt_type = postgresql.ENUM("base", "edit", "extension", name="prompt_type", create_type=False)
tag_category = postgresql.ENUM("technique", "content_type", "character", "setting", "mood", "custom", name="tag_category", create_type=False)
user_role = postgresql.ENUM("admin", "user", name="user_role", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    node_type.create(bind, checkfirst=True)
    moderation_outcome.create(bind, checkfirst=True)
    generation_mode.create(bind, checkfirst=True)
    prompt_type.create(bind, checkfirst=True)
    tag_category.create(bind, checkfirst=True)
    user_role.create(bind, checkfirst=True)

    op.create_table(
        "output_nodes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tree_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("node_type", node_type, nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("thumbnail_path", sa.String(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("moderation_outcome", moderation_outcome, nullable=False),
        sa.Column("generation_mode", generation_mode, nullable=False),
        sa.CheckConstraint("rating IS NULL OR (rating >= 1 AND rating <= 10)", name="ck_output_nodes_rating_range"),
        sa.ForeignKeyConstraint(["parent_id"], ["output_nodes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_output_nodes_tree_id"), "output_nodes", ["tree_id"], unique=False)

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_image_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["cover_image_id"], ["output_nodes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "prompt_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("template_text", sa.Text(), nullable=False),
        sa.Column("placeholders", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("journal", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", tag_category, nullable=False),
        sa.Column("color", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "output_tags",
        sa.Column("output_node_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["output_node_id"], ["output_nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("output_node_id", "tag_id"),
        sa.UniqueConstraint("output_node_id", "tag_id", name="uq_output_tags_output_node_id_tag_id"),
    )

    op.create_table(
        "project_nodes",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("output_node_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["output_node_id"], ["output_nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "output_node_id"),
        sa.UniqueConstraint("project_id", "output_node_id", name="uq_project_nodes_project_id_output_node_id"),
    )

    op.create_table(
        "prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("output_node_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("prompt_type", prompt_type, nullable=False),
        sa.Column("extension_order", sa.Integer(), nullable=True),
        sa.Column("parent_prompt_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("technique_tags", postgresql.ARRAY(sa.String()), server_default=sa.text("'{}'"), nullable=False),
        sa.Column("includes_spicy_header", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("dodge_phrases_used", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["output_node_id"], ["output_nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_prompt_id"], ["prompts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "session_nodes",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("output_node_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["output_node_id"], ["output_nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("session_id", "output_node_id"),
        sa.UniqueConstraint("session_id", "output_node_id", name="uq_session_nodes_session_id_output_node_id"),
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_table("session_nodes")
    op.drop_table("prompts")
    op.drop_table("project_nodes")
    op.drop_table("output_tags")
    op.drop_table("users")
    op.drop_table("tags")
    op.drop_table("sessions")
    op.drop_table("prompt_templates")
    op.drop_table("projects")
    op.drop_index(op.f("ix_output_nodes_tree_id"), table_name="output_nodes")
    op.drop_table("output_nodes")

    user_role.drop(bind, checkfirst=True)
    tag_category.drop(bind, checkfirst=True)
    prompt_type.drop(bind, checkfirst=True)
    generation_mode.drop(bind, checkfirst=True)
    moderation_outcome.drop(bind, checkfirst=True)
    node_type.drop(bind, checkfirst=True)

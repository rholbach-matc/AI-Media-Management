"""add output title

Revision ID: 0003_add_output_title
Revises: 0002_add_animated_thumbnail_path
Create Date: 2026-06-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_add_output_title"
down_revision: Union[str, None] = "0002_add_animated_thumbnail_path"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("output_nodes", sa.Column("title", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("output_nodes", "title")

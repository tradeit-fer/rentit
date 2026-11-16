"""Add phone and city to user profiles."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c42e7a1b9d30"
down_revision: Union[str, Sequence[str], None] = "5e1a6b3c8d42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column("user_profiles", sa.Column("city", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profiles", "city")
    op.drop_column("user_profiles", "phone")

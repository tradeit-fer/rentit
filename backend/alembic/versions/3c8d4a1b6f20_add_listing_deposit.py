"""Dodaje polog oglasu.

Revision ID: 3c8d4a1b6f20
Revises: 98c18d3e95b9
Create Date: 2026-11-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "3c8d4a1b6f20"
down_revision: Union[str, Sequence[str], None] = "98c18d3e95b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "listings",
        sa.Column("deposit_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_check_constraint(
        "ck_listings_deposit_cents", "listings", "deposit_cents >= 0"
    )


def downgrade() -> None:
    op.drop_constraint("ck_listings_deposit_cents", "listings", type_="check")
    op.drop_column("listings", "deposit_cents")
